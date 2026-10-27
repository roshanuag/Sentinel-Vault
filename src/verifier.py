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

from datetime import datetime, timezone

from collector import collect_windows, build_chain, DEFAULT_WINDOW_SECONDS


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
            "summary": {"intact": 0, "tampered": 0, "missing": 0, "unanchored": 0},
            "first_break": None,
            "chain_broken_from": None,
            "windows": [],
        }

    # Recompute the current log's windows + chain, exactly as at anchor time.
    windows = collect_windows(log_path, window_seconds)
    records = build_chain(windows, window_seconds)
    current_by_id = {r["window_start"]: r for r in records}
    anchored_ids = {a["window_id"] for a in anchored}

    summary = {"intact": 0, "tampered": 0, "missing": 0, "unanchored": 0}
    result_windows = []
    first_break = None

    # Walk the anchored windows (the source of truth) in time order.
    for a in anchored:
        window_id = a["window_id"]
        cur = current_by_id.get(window_id)

        if cur is None:
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

    compromised = summary["tampered"] > 0 or summary["missing"] > 0
    overall_status = "COMPROMISED" if compromised else "INTACT"

    return {
        **base,
        "overall_status": overall_status,
        "summary": summary,
        "first_break": first_break,
        "chain_broken_from": first_break["window_id"] if first_break else None,
        "windows": result_windows,
    }
