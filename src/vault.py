#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 2
Command-line tool that ties the engine together.

Commands:
    init-demo     reset the demo: copy the pristine sample to a working log and
                  create a fresh (empty) ledger
    anchor        fingerprint the working log's windows and append them to the ledger
    windows       list what is currently anchored in the ledger
    verify        compare the working log against the ledger (intact/tampered/missing)
    tamper-demo   simulate an attacker editing/deleting a line in a window

These commands map 1:1 to the HTTP endpoints in API_CONTRACT.md (built in the
next milestone). Each command prints the same data the API will return.
"""

import argparse
import json
import os
import shutil
import sys

from collector import collect_windows, build_chain, DEFAULT_WINDOW_SECONDS
import ledger
import verifier
import tamper

DEFAULT_SAMPLE = "data/sample_auth.log"
DEFAULT_LOG = "data/server.log"


def _note(ledger_type):
    if ledger_type != "testnet":
        print("NOTE: anchor mode = LOCAL ledger (simulated immutable storage, "
              "offline). Fingerprints/verification are real; only the "
              "'cannot be changed' guarantee is simulated.", file=sys.stderr)


def cmd_init_demo(args):
    if not os.path.exists(args.source):
        print(f"Error: sample log not found: {args.source!r}", file=sys.stderr)
        return 1
    os.makedirs(os.path.dirname(args.log) or ".", exist_ok=True)
    shutil.copyfile(args.source, args.log)
    # Fresh ledger: remove the old DB file, then recreate the empty schema.
    if os.path.exists(args.db):
        os.remove(args.db)
    ledger.init_db(args.db)
    print(f"Demo reset. Working log: {args.log} (copied from {args.source}). "
          f"Fresh empty ledger: {args.db}.")
    return 0


def cmd_anchor(args):
    try:
        windows = collect_windows(args.log, args.window)
    except (FileNotFoundError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    records = build_chain(windows, args.window)
    newly, already = ledger.anchor_windows(
        records, db_path=args.db, ledger_type=args.ledger_type
    )
    _note(args.ledger_type)
    result = {
        "mock": args.ledger_type != "testnet",
        "ledger_type": args.ledger_type,
        "newly_anchored": newly,
        "already_anchored": already,
        "total_windows": len(records),
        "chain_tip": records[-1]["chain_hash"] if records else None,
    }
    print(json.dumps(result, indent=2))
    return 0


def cmd_windows(args):
    rows = ledger.get_all_windows(args.db)
    ledger_type = rows[0]["ledger_type"] if rows else args.ledger_type
    _note(ledger_type)
    result = {
        "mock": ledger_type != "testnet",
        "ledger_type": ledger_type,
        "count": len(rows),
        "windows": rows,
    }
    print(json.dumps(result, indent=2))
    return 0


def cmd_verify(args):
    try:
        result = verifier.verify(args.log, db_path=args.db, window_seconds=args.window)
    except (FileNotFoundError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    _note(result["ledger_type"])
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        _print_verify_table(result)
    # Exit code 3 if compromised, so scripts/CI can react; 0 if intact.
    return 3 if result["overall_status"] == "COMPROMISED" else 0


def _print_verify_table(result):
    print(f"Overall: {result['overall_status']}   "
          f"(intact={result['summary']['intact']} "
          f"tampered={result['summary']['tampered']} "
          f"missing={result['summary']['missing']} "
          f"unanchored={result['summary']['unanchored']})")
    print("-" * 78)
    for w in result["windows"]:
        print(f"[{w['status']:<10}] win {w['index']}  {w['start_time']}  {w['detail']}")
    print("-" * 78)
    fb = result["first_break"]
    if fb:
        print(f"FIRST BREAK: window {fb['index']} ({fb['start_time']}) -> "
              f"{fb['status']}: {fb['detail']}")
    else:
        print("No break found. All anchored windows are intact.")


def cmd_tamper_demo(args):
    try:
        result = tamper.tamper_line(
            args.log, args.window_index, args.action, window_seconds=args.window
        )
    except (FileNotFoundError, ValueError, IndexError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description="Tamper-Proof Security Log Vault CLI")
    parser.add_argument("--log", default=DEFAULT_LOG, help="working log file")
    parser.add_argument("--db", default=ledger.DEFAULT_DB_PATH, help="ledger database")
    parser.add_argument("--window", type=int, default=DEFAULT_WINDOW_SECONDS,
                        help="window size in seconds (default 300)")
    parser.add_argument("--ledger-type", default="local", choices=["local", "testnet"],
                        help="anchor adapter type (default local)")

    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init-demo", help="reset demo: fresh working log + empty ledger")
    p_init.add_argument("--source", default=DEFAULT_SAMPLE, help="pristine sample log")
    p_init.set_defaults(func=cmd_init_demo)

    sub.add_parser("anchor", help="anchor new windows").set_defaults(func=cmd_anchor)
    sub.add_parser("windows", help="list anchored windows").set_defaults(func=cmd_windows)

    p_verify = sub.add_parser("verify", help="verify log against ledger")
    p_verify.add_argument("--json", action="store_true", help="print full JSON")
    p_verify.set_defaults(func=cmd_verify)

    p_tamper = sub.add_parser("tamper-demo", help="simulate attacker editing a window")
    p_tamper.add_argument("--window-index", type=int, required=True,
                          help="which window to tamper (0 = first)")
    p_tamper.add_argument("--action", choices=["modify", "delete"], default="modify",
                          help="modify a line or delete a line")
    p_tamper.set_defaults(func=cmd_tamper_demo)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
