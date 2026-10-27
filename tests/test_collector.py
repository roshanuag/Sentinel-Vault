"""Time-windowing and chained-hashing behaviour."""
import hashlib

from collector import collect_windows, build_chain, GENESIS_PREV


def test_groups_into_three_five_minute_windows(sample_log):
    windows = collect_windows(sample_log, 300)
    assert len(windows) == 3
    assert [len(w["lines"]) for w in windows] == [4, 4, 4]
    assert windows[0]["start"].isoformat() == "2026-10-27T10:00:00"
    assert windows[1]["start"].isoformat() == "2026-10-27T10:05:00"
    assert windows[2]["start"].isoformat() == "2026-10-27T10:10:00"


def test_hashing_is_deterministic(sample_log):
    a = build_chain(collect_windows(sample_log, 300), 300)
    b = build_chain(collect_windows(sample_log, 300), 300)
    assert [r["chain_hash"] for r in a] == [r["chain_hash"] for r in b]
    assert [r["log_hash"] for r in a] == [r["log_hash"] for r in b]


def test_windows_are_chained(sample_log):
    recs = build_chain(collect_windows(sample_log, 300), 300)
    assert recs[0]["prev_hash"] == GENESIS_PREV
    assert recs[1]["prev_hash"] == recs[0]["chain_hash"]
    assert recs[2]["prev_hash"] == recs[1]["chain_hash"]


def test_chain_hash_matches_formula(sample_log):
    recs = build_chain(collect_windows(sample_log, 300), 300)
    r = recs[1]
    expected = hashlib.sha256(
        f"{r['prev_hash']}|{r['window_start']}|{r['log_hash']}".encode("utf-8")
    ).hexdigest()
    assert r["chain_hash"] == expected


def test_log_hash_matches_window_text(sample_log):
    windows = collect_windows(sample_log, 300)
    recs = build_chain(windows, 300)
    text = "\n".join(windows[0]["lines"])
    assert recs[0]["log_hash"] == hashlib.sha256(text.encode("utf-8")).hexdigest()
