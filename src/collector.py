#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 1
Log Collector + Chained SHA-256 Hashing Engine.

What this does, in plain words:
  1. Reads a log file line by line.
  2. Groups the lines into fixed time windows (default: 5 minutes) using the
     timestamp at the start of each line.
  3. Makes a SHA-256 fingerprint ("log_hash") of each window's log text.
  4. Chains the windows together: each window's "chain_hash" is built from the
     PREVIOUS window's chain_hash + this window's start time + its log_hash.
     Change or remove any window and every window after it stops matching,
     just like a mini blockchain.

What this does NOT do yet (later milestones):
  - store to a database
  - anchor the hashes on-chain / in an append-only ledger
  - verify current logs against a stored anchor
  - serve an HTTP API

Determinism note: windowing uses only the clock fields of each timestamp
(hour/minute/second), never the machine's local timezone, so the same log
file produces the same hashes on any computer.

Usage:
    python src/collector.py data/sample_auth.log
    python src/collector.py data/sample_auth.log --json
    python src/collector.py data/sample_auth.log --window 300
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timedelta

# A hash is 64 hex characters. The very first window has no previous window,
# so we use 64 zeros as its "previous" value (the genesis / starting point).
GENESIS_PREV = "0" * 64

# How each line's timestamp is written at the start of the line.
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"
TIMESTAMP_LEN = 19  # length of "2026-10-27 10:00:01"

DEFAULT_WINDOW_SECONDS = 300  # 5 minutes


def parse_timestamp(line):
    """Return the datetime at the start of a line, or None if there isn't one.

    Lines without a leading timestamp are treated as continuation lines that
    belong to the same window as the line above them (e.g. multi-line entries).
    """
    head = line[:TIMESTAMP_LEN]
    try:
        return datetime.strptime(head, TIMESTAMP_FORMAT)
    except ValueError:
        return None


def window_start_for(dt, window_seconds):
    """Floor a timestamp down to the start of its time window.

    Uses only the clock fields (no timezone), so it is machine-independent.
    """
    seconds_into_day = dt.hour * 3600 + dt.minute * 60 + dt.second
    bucket = (seconds_into_day // window_seconds) * window_seconds
    start = dt.replace(
        hour=bucket // 3600,
        minute=(bucket % 3600) // 60,
        second=bucket % 60,
        microsecond=0,
    )
    return start


def collect_windows(path, window_seconds):
    """Read the log file and group its lines into ordered time windows.

    Returns a list of dicts: {"start": datetime, "lines": [str, ...]},
    sorted by start time. Raises ValueError on an unusable file.
    """
    # window_key (date + start time) -> {"start": datetime, "lines": [...]}
    windows = {}
    current_key = None

    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            if line.strip() == "":
                continue  # skip blank lines

            dt = parse_timestamp(line)
            if dt is not None:
                start = window_start_for(dt, window_seconds)
                # Key includes the full date so different days never collide.
                current_key = start.isoformat()
                if current_key not in windows:
                    windows[current_key] = {"start": start, "lines": []}
                windows[current_key]["lines"].append(line)
            else:
                # Continuation line: attach to the window we are currently in.
                if current_key is None:
                    raise ValueError(
                        "First non-empty line has no valid timestamp "
                        f"(expected format '{TIMESTAMP_FORMAT}'): {line!r}"
                    )
                windows[current_key]["lines"].append(line)

    if not windows:
        raise ValueError(f"No log lines with timestamps were found in {path!r}.")

    # Sort windows by start time so the chain is always built in time order.
    return [windows[key] for key in sorted(windows.keys())]


def build_chain(windows, window_seconds):
    """Hash each window and link them into a chain.

    Returns a list of records, one per window, each with its fingerprint
    (log_hash), the previous chain hash (prev_hash), and its own chain_hash.
    """
    records = []
    prev_hash = GENESIS_PREV

    for index, window in enumerate(windows):
        start = window["start"]
        end = start + timedelta(seconds=window_seconds)
        log_text = "\n".join(window["lines"])

        # Fingerprint of just this window's log content.
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest()

        # Chain link: ties this window to the one before it and to its time.
        chain_input = f"{prev_hash}|{start.isoformat()}|{log_hash}"
        chain_hash = hashlib.sha256(chain_input.encode("utf-8")).hexdigest()

        records.append(
            {
                "index": index,
                "window_start": start.isoformat(),
                "window_end": end.isoformat(),
                "line_count": len(window["lines"]),
                "log_hash": log_hash,
                "prev_hash": prev_hash,
                "chain_hash": chain_hash,
            }
        )
        prev_hash = chain_hash

    return records


def print_table(records):
    """Print the chain as a readable table for a human to eyeball."""
    print(f"{'#':>2}  {'window start':<19}  {'lines':>5}  "
          f"{'log_hash (first 16)':<18}  {'chain_hash (first 16)':<18}")
    print("-" * 72)
    for r in records:
        print(f"{r['index']:>2}  {r['window_start']:<19}  {r['line_count']:>5}  "
              f"{r['log_hash'][:16]:<18}  {r['chain_hash'][:16]:<18}")
    print("-" * 72)
    tip = records[-1]["chain_hash"] if records else GENESIS_PREV
    print(f"Chain tip (represents the whole log's current state): {tip}")


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Collect logs into time windows and chain-hash them (SHA-256)."
    )
    parser.add_argument("logfile", help="path to the log file to process")
    parser.add_argument(
        "--window", type=int, default=DEFAULT_WINDOW_SECONDS,
        help="window size in seconds (default: 300 = 5 minutes)",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="print the chain as JSON instead of a table",
    )
    args = parser.parse_args(argv)

    if args.window <= 0 or 86400 % args.window != 0:
        print(
            f"Error: --window must be a positive number of seconds that divides "
            f"evenly into a day (e.g. 60, 300, 600). Got {args.window}.",
            file=sys.stderr,
        )
        return 2

    try:
        windows = collect_windows(args.logfile, args.window)
    except FileNotFoundError:
        print(f"Error: log file not found: {args.logfile!r}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    records = build_chain(windows, args.window)

    if args.json:
        print(json.dumps(records, indent=2))
    else:
        print_table(records)

    return 0


if __name__ == "__main__":
    sys.exit(main())
