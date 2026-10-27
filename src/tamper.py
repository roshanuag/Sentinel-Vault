#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 2
Demo-only attacker simulation.

Plain words: this pretends to be an attacker with access to the log file. It
either MODIFIES a line (e.g. turns a "Failed" login into "Accepted" to hide a
break-in) or DELETES a line inside a chosen time window. After running this, a
verify pass should flag that exact window.

SAFETY: this is a demo helper only. In a real deployment this code would not
exist / would be disabled. It edits the given log file in place, so run it on a
working copy (data/server.log), never on a real system log.
"""

from collector import parse_timestamp, window_start_for, DEFAULT_WINDOW_SECONDS


def _map_lines_to_windows(lines, window_seconds):
    """Return an ordered list of (window_start_iso, [physical_line_indexes]).

    Uses the SAME windowing rules as the collector so the window we tamper with
    lines up with the window the verifier checks.
    """
    windows = {}
    order = []
    current_key = None
    for idx, raw in enumerate(lines):
        text = raw.rstrip("\n")
        if text.strip() == "":
            continue
        dt = parse_timestamp(text)
        if dt is not None:
            start = window_start_for(dt, window_seconds)
            current_key = start.isoformat()
            if current_key not in windows:
                windows[current_key] = []
                order.append(current_key)
            windows[current_key].append(idx)
        elif current_key is not None:
            windows[current_key].append(idx)
    # Chronological order to match the verifier's view.
    order.sort()
    return [(key, windows[key]) for key in order]


def tamper_line(log_path, window_index, action, window_seconds=DEFAULT_WINDOW_SECONDS):
    """Modify or delete one line inside window `window_index` of `log_path`.

    Returns a dict matching the POST /api/tamper-demo response in API_CONTRACT.md.
    Raises ValueError / IndexError on bad input.
    """
    if action not in ("modify", "delete"):
        raise ValueError(f"action must be 'modify' or 'delete', got {action!r}")

    with open(log_path, "r", encoding="utf-8") as handle:
        lines = handle.readlines()  # keeps newline characters

    mapped = _map_lines_to_windows(lines, window_seconds)
    if not mapped:
        raise ValueError("No timestamped windows found in the log file.")
    if window_index < 0 or window_index >= len(mapped):
        raise IndexError(
            f"window_index {window_index} is out of range "
            f"(0..{len(mapped) - 1})."
        )

    window_id, line_indexes = mapped[window_index]

    if action == "delete":
        target = line_indexes[-1]  # delete the last line of the window
        before = lines[target].rstrip("\n")
        del lines[target]
        after = None
        line_number = target + 1  # 1-based for humans
    else:  # modify
        target = line_indexes[0]  # modify the first line of the window
        original = lines[target]
        newline = "\n" if original.endswith("\n") else ""
        text = original.rstrip("\n")
        before = text
        # Keep the timestamp (first 19 chars) so the line stays in this window;
        # change the message so the fingerprint no longer matches.
        prefix = text[:19]
        message = text[19:]
        if "Failed" in message:
            new_message = message.replace("Failed", "Accepted", 1)
        else:
            new_message = message + "  [edited]"
        new_text = prefix + new_message
        lines[target] = new_text + newline
        after = new_text
        line_number = target + 1

    with open(log_path, "w", encoding="utf-8") as handle:
        handle.writelines(lines)

    return {
        "mock": True,
        "action": action,
        "target_window_index": window_index,
        "target_window_id": window_id,
        "line_changed": {
            "line_number": line_number,
            "before": before,
            "after": after,
        },
        "note": "The log file was altered. Run a verify pass to detect it.",
    }
