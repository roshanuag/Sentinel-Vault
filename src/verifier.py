#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 2
Verification engine.

Plain words: re-read the current log file, fingerprint it the SAME way we did
when we anchored it, and compare each window against the anchored ledger. Report,
per window, whether it is:

  - INTACT     : current fingerprint matches the anchored one
  - TAMPERED   : the window still exists but its content changed
  - MISSING    : the whole window was removed from the current log
  - UNANCHORED : a window exists now that was never anchored (e.g. newer logs)

It also pinpoints the FIRST window where the chain breaks - the exact index and
timestamp an investigator should look at.
"""

import hashlib
from datetime import datetime, timezone

from collector import collect_windows, build_chain, DEFAULT_WINDOW_SECONDS, GENESIS_PREV
import ledger


def verify(log_path, anchor, window_seconds=DEFAULT_WINDOW_SECONDS):
    """Compare the current log file against the anchored records.

    `anchor` is any backend from anchors.py (LocalAnchor or EvmAnchor); the
    verification logic is identical regardless of which one is active.
    Returns a dict matching the POST /api/verify response in API_CONTRACT.md.
    """
    anchored = anchor.get_windows()
    ledger_type = anchor.ledger_type
    is_mock = anchor.is_mock

    base = {
        "mock": is_mock,
        "ledger_type": ledger_type,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    if not anchored:
        return {
            **base,
            "overall_status": "NO_ANCHORS",
            "summary": {"intact": 0, "tampered": 0, "missing": 0,
                        "unanchored": 0, "ledger_tampered": 0},
            "first_break": None,
            "chain_broken_from": None,
            "windows": [],
        }

    # Recompute the current log's windows + chain, exactly as at anchor time.
    windows = collect_windows(log_path, window_seconds)
    records = build_chain(windows, window_seconds)
    current_by_id = {r["window_start"]: r for r in records}
    anchored_ids = {a["window_id"] for a in anchored}

    summary = {"intact": 0, "tampered": 0, "missing": 0,
               "unanchored": 0, "ledger_tampered": 0}
    result_windows = []
    first_break = None
    prev_chain = GENESIS_PREV  # row 0 must link back to the genesis (all zeros)

    # Walk the anchored windows (the source of truth) in time order.
    for a in anchored:
        window_id = a["window_id"]
        cur = current_by_id.get(window_id)

        # Ledger self-check, two parts:
        #  (1) internal: chain_hash == SHA-256(prev_hash | start_time | log_hash)
        #  (2) link:     prev_hash == the previous row's chain_hash (genesis for row 0)
        # (2) catches an attacker who edits a row AND recomputes its own chain_hash:
        # the next row's prev_hash no longer matches, so the chain breaks there.
        expected_chain = hashlib.sha256(
            f"{a['prev_hash']}|{a['start_time']}|{a['log_hash']}".encode("utf-8")
        ).hexdigest()
        internal_ok = a["chain_hash"] == expected_chain
        link_ok = a["prev_hash"] == prev_chain

        if not internal_ok or not link_ok:
            status = "LEDGER_TAMPERED"
            current_hash = cur["log_hash"] if cur else None
            current_lines = cur["line_count"] if cur else None
            if not internal_ok:
                detail = ("The anchored record itself is inconsistent - this window's "
                          "stored fingerprint was altered in the ledger.")
            else:
                detail = ("The ledger chain is broken here - this record's prev_hash "
                          "does not match the previous window's chain hash.")
        elif cur is None:
            status = "MISSING"
            current_hash = None
            current_lines = None
            detail = "The entire time window is gone from the current log (deleted)."
        elif cur["log_hash"] == a["log_hash"]:
            status = "INTACT"
            current_hash = cur["log_hash"]
            current_lines = cur["line_count"]
            detail = "Matches the anchored fingerprint."
        else:
            status = "TAMPERED"
            current_hash = cur["log_hash"]
            current_lines = cur["line_count"]
            anchored_lines = a["line_count"]
            if current_lines < anchored_lines:
                detail = (f"Content changed; line count {anchored_lines} -> "
                          f"{current_lines} (a line was likely deleted).")
            elif current_lines > anchored_lines:
                detail = (f"Content changed; line count {anchored_lines} -> "
                          f"{current_lines} (a line was likely added).")
            else:
                detail = (f"Content changed; same line count ({current_lines}) "
                          f"- a line was likely modified.")

        summary[status.lower()] += 1
        result_windows.append({
            "window_id": window_id,
            "index": a["window_index"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
            "status": status,
            "anchored_log_hash": a["log_hash"],
            "current_log_hash": current_hash,
            "anchored_line_count": a["line_count"],
            "current_line_count": current_lines,
            "anchored_at": a["anchored_at"],
            "detail": detail,
        })

        if status != "INTACT" and first_break is None:
            first_break = {
                "index": a["window_index"],
                "window_id": window_id,
                "start_time": a["start_time"],
                "status": status,
                "detail": detail,
            }

        # Advance the chain pointer to THIS row's stored chain hash for the next row.
        prev_chain = a["chain_hash"]

    # Windows that exist now but were never anchored (informational, not a break).
    for r in records:
        if r["window_start"] not in anchored_ids:
            summary["unanchored"] += 1
            result_windows.append({
                "window_id": r["window_start"],
                "index": r["index"],
                "start_time": r["window_start"],
                "end_time": r["window_end"],
                "status": "UNANCHORED",
                "anchored_log_hash": None,
                "current_log_hash": r["log_hash"],
                "anchored_line_count": None,
                "current_line_count": r["line_count"],
                "anchored_at": None,
                "detail": "Present in the current log but never anchored "
                          "(likely newer logs; anchor them to protect them).",
            })

    # Keep the timeline in chronological order for the dashboard.
    result_windows.sort(key=lambda w: w["start_time"])

    # Record when each compromised window was FIRST noticed (written once and never
    # overwritten), then attach first_noticed_at to every window for the response.
    now = datetime.now(timezone.utc).isoformat()
    newly_flagged = [
        w["window_id"] for w in result_windows
        if w["status"] in ("TAMPERED", "MISSING", "LEDGER_TAMPERED")
    ]
    ledger.record_first_noticed(newly_flagged, now, db_path=anchor.store_path)
    first_noticed = ledger.get_incidents(anchor.store_path)
    for w in result_windows:
        w["first_noticed_at"] = first_noticed.get(w["window_id"])

    compromised = (summary["tampered"] > 0 or summary["missing"] > 0
                   or summary["ledger_tampered"] > 0)
    overall_status = "COMPROMISED" if compromised else "INTACT"

    # Simulated SOC incident-response alerting: log each compromised window to the
    # console as a mock webhook to the security team.
    if compromised:
        for w in result_windows:
            if w["status"] in ("TAMPERED", "MISSING", "LEDGER_TAMPERED"):
                print(
                    f"[SOC ALERT] CRITICAL: {w['status']} detected in Window "
                    f"{w['index']} ({w['start_time']}). "
                    f"Mock webhook fired to Security Team."
                )

    return {
        **base,
        "overall_status": overall_status,
        "summary": summary,
        "first_break": first_break,
        "chain_broken_from": first_break["window_id"] if first_break else None,
        "windows": result_windows,
    }
