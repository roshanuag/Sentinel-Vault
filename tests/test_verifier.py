"""Verifier catches tampering identically to how the demo shows it."""
from collector import collect_windows, build_chain
import anchors
import verifier
import tamper


def _anchored(sample_log, db_path):
    recs = build_chain(collect_windows(sample_log, 300), 300)
    anchor = anchors.LocalAnchor(db_path)
    anchor.anchor(recs)
    return anchor


def test_clean_log_is_intact(sample_log, db_path):
    anchor = _anchored(sample_log, db_path)
    result = verifier.verify(sample_log, anchor, 300)
    assert result["overall_status"] == "INTACT"
    assert result["summary"]["intact"] == 3
    assert result["first_break"] is None


def test_modified_line_flags_exact_window(sample_log, db_path):
    anchor = _anchored(sample_log, db_path)
    tamper.tamper_line(sample_log, 0, "modify", 300)

    result = verifier.verify(sample_log, anchor, 300)
    assert result["overall_status"] == "COMPROMISED"
    assert result["first_break"]["index"] == 0

    by_index = {w["index"]: w for w in result["windows"]}
    assert by_index[0]["status"] == "TAMPERED"
    assert by_index[1]["status"] == "INTACT"
    assert by_index[2]["status"] == "INTACT"


def test_deleted_line_shows_line_count_drop(sample_log, db_path):
    anchor = _anchored(sample_log, db_path)
    tamper.tamper_line(sample_log, 1, "delete", 300)

    result = verifier.verify(sample_log, anchor, 300)
    window = next(w for w in result["windows"] if w["index"] == 1)
    assert window["status"] == "TAMPERED"
    assert window["anchored_line_count"] == 4
    assert window["current_line_count"] == 3


def test_missing_window_is_detected(sample_log, db_path):
    anchor = _anchored(sample_log, db_path)
    # Drop every line of the third window (10:10-10:14) entirely.
    with open(sample_log, "r", encoding="utf-8") as fh:
        kept = [ln for ln in fh if not ln.startswith("2026-10-27 10:1")]
    with open(sample_log, "w", encoding="utf-8") as fh:
        fh.writelines(kept)

    result = verifier.verify(sample_log, anchor, 300)
    by_index = {w["index"]: w for w in result["windows"]}
    assert by_index[2]["status"] == "MISSING"
    assert by_index[2]["current_log_hash"] is None
    assert result["summary"]["missing"] == 1
