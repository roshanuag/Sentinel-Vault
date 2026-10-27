"""Local append-only ledger: insertion, idempotency, and immutability."""
import sqlite3

import pytest

from collector import collect_windows, build_chain
import ledger


def _records(sample_log):
    return build_chain(collect_windows(sample_log, 300), 300)


def test_anchor_inserts_and_reads_back(sample_log, db_path):
    recs = _records(sample_log)
    newly, already = ledger.anchor_windows(recs, db_path=db_path)
    assert (newly, already) == (3, 0)

    rows = ledger.get_all_windows(db_path)
    assert len(rows) == 3
    assert rows[0]["log_hash"] == recs[0]["log_hash"]
    assert rows[0]["ledger_type"] == "local"


def test_anchor_is_idempotent(sample_log, db_path):
    recs = _records(sample_log)
    ledger.anchor_windows(recs, db_path=db_path)
    newly, already = ledger.anchor_windows(recs, db_path=db_path)
    assert (newly, already) == (0, 3)


def test_ledger_rejects_update_and_delete(sample_log, db_path):
    ledger.anchor_windows(_records(sample_log), db_path=db_path)
    conn = sqlite3.connect(db_path)
    try:
        with pytest.raises(sqlite3.Error):
            conn.execute("UPDATE anchored_windows SET log_hash='HACKED'")
        with pytest.raises(sqlite3.Error):
            conn.execute("DELETE FROM anchored_windows")
    finally:
        conn.close()
