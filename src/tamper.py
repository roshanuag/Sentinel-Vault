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
    """Modify or delete content inside window `window_index` of `log_path`.

    Actions:
      - "modify"        : change the first line of the window (content edit)
      - "delete"        : remove the last line of the window (one line gone)
      - "delete_window" : remove EVERY line of the window, so the whole time
                          slice disappears and the next verify reports MISSING

    Returns a dict matching the POST /api/tamper-demo response in API_CONTRACT.md.
    Raises ValueError / IndexError on bad input.
    """
    if action not in ("modify", "delete", "delete_window"):
        raise ValueError(
            f"action must be 'modify', 'delete' or 'delete_window', got {action!r}"
        )

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
    lines_removed = None

    if action == "delete_window":
        # Remove EVERY line of this window so the whole time slice is gone.
        # Delete from the highest index down so earlier indexes don't shift.
        removed = []
        for idx in sorted(line_indexes, reverse=True):
            removed.append(lines[idx].rstrip("\n"))
            del lines[idx]
        removed.reverse()  # back to top-to-bottom order for the response
        lines_removed = len(line_indexes)
        before = removed  # list of the removed lines
        after = None
        line_number = None
    elif action == "delete":
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

    if action == "delete_window":
        return {
            "mock": True,
            "action": action,
            "target_window_index": window_index,
            "target_window_id": window_id,
            "lines_removed": lines_removed,
            "line_changed": None,
            "removed_lines": before,  # the full lines that were deleted
            "note": (
                "The entire window was removed from the log. "
                "Run a verify pass; this window will show MISSING."
            ),
        }

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
