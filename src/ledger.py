#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 2
Append-only anchor ledger, backed by SQLite (the "local" anchor adapter).

Plain words: this is the notebook where we write down each window's fingerprint
so we can check the logs against it later. To copy what a real blockchain does,
the notebook is APPEND-ONLY: the database refuses UPDATE and DELETE on anchored
rows (enforced by SQLite triggers), so once a window's fingerprint is written it
cannot be quietly changed in place.

HONEST LIMITATION: this is a *local simulation* of an immutable ledger. A person
with full access to the server could still delete the whole database file or turn
the triggers off. That is exactly why the real guarantee needs an independent
anchor (a separate machine or a public testnet) - the pluggable `ledger_type`
field is where that swap happens. For the offline demo, `ledger_type = "local"`.
"""

import sqlite3
from datetime import datetime, timezone

DEFAULT_DB_PATH = "data/ledger.sqlite"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS anchored_windows (
    window_id     TEXT    PRIMARY KEY,   -- stable id = window start time (ISO)
    window_index  INTEGER NOT NULL,      -- order of the window at anchor time
    start_time    TEXT    NOT NULL,
    end_time      TEXT    NOT NULL,
    line_count    INTEGER NOT NULL,
    log_hash      TEXT    NOT NULL,       -- fingerprint of this window's log text
    prev_hash     TEXT    NOT NULL,       -- chain hash of the previous window
    chain_hash    TEXT    NOT NULL,       -- this window's chained hash
    anchored_at   TEXT    NOT NULL,       -- when we recorded it (metadata only)
    ledger_type   TEXT    NOT NULL        -- "local" or "testnet"
);

-- Append-only enforcement: once written, a row cannot be edited or removed.
CREATE TRIGGER IF NOT EXISTS anchored_windows_no_update
BEFORE UPDATE ON anchored_windows
BEGIN SELECT RAISE(ABORT, 'append-only ledger: UPDATE is not allowed'); END;

CREATE TRIGGER IF NOT EXISTS anchored_windows_no_delete
BEFORE DELETE ON anchored_windows
BEGIN SELECT RAISE(ABORT, 'append-only ledger: DELETE is not allowed'); END;

-- When a window was FIRST noticed tampered/missing (set once, never overwritten).
CREATE TABLE IF NOT EXISTS incidents (
    window_id        TEXT PRIMARY KEY,
    first_noticed_at TEXT NOT NULL
);
"""


def connect(db_path=DEFAULT_DB_PATH):
    """Open the ledger database with dict-like rows."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path=DEFAULT_DB_PATH):
    """Create the ledger table and append-only triggers if they do not exist."""
    conn = connect(db_path)
    try:
        conn.executescript(_SCHEMA)
        conn.commit()
    finally:
        conn.close()


def anchor_windows(records, db_path=DEFAULT_DB_PATH, ledger_type="local"):
    """Append new windows to the ledger. Returns (newly_anchored, already_there).

    `records` is the output of collector.build_chain(). A window already in the
    ledger is left untouched (append-only): we never overwrite its original
    fingerprint, because that original is exactly what we check against later.
    """
    init_db(db_path)
    conn = connect(db_path)
    try:
        existing = {
            row["window_id"]
            for row in conn.execute("SELECT window_id FROM anchored_windows")
        }
        now = datetime.now(timezone.utc).isoformat()
        newly = 0
        already = 0
        for r in records:
            window_id = r["window_start"]
            if window_id in existing:
                already += 1
                continue
            conn.execute(
                """
                INSERT INTO anchored_windows (
                    window_id, window_index, start_time, end_time, line_count,
                    log_hash, prev_hash, chain_hash, anchored_at, ledger_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    window_id,
                    r["index"],
                    r["window_start"],
                    r["window_end"],
                    r["line_count"],
                    r["log_hash"],
                    r["prev_hash"],
                    r["chain_hash"],
                    now,
                    ledger_type,
                ),
            )
            newly += 1
        conn.commit()
        return newly, already
    finally:
        conn.close()


def get_all_windows(db_path=DEFAULT_DB_PATH):
    """Return all anchored windows as a list of plain dicts, oldest first."""
    conn = connect(db_path)
    try:
        rows = conn.execute(
            "SELECT * FROM anchored_windows ORDER BY start_time ASC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def record_first_noticed(window_ids, when, db_path=DEFAULT_DB_PATH):
    """Record the first time each window was noticed compromised.

    Uses INSERT OR IGNORE so a window's first_noticed_at is written ONCE and is
    never overwritten by a later verify run. `window_ids` is an iterable.
    """
    init_db(db_path)
    conn = connect(db_path)
    try:
        conn.executemany(
            "INSERT OR IGNORE INTO incidents (window_id, first_noticed_at) VALUES (?, ?)",
            [(wid, when) for wid in window_ids],
        )
        conn.commit()
    finally:
        conn.close()


def get_incidents(db_path=DEFAULT_DB_PATH):
    """Return {window_id: first_noticed_at} for all recorded incidents."""
    init_db(db_path)
    conn = connect(db_path)
    try:
        return {
            row["window_id"]: row["first_noticed_at"]
            for row in conn.execute("SELECT window_id, first_noticed_at FROM incidents")
        }
    finally:
        conn.close()


def clear_incidents(db_path=DEFAULT_DB_PATH):
    """Forget all first-noticed records (used by reset-demo / init-demo)."""
    init_db(db_path)
    conn = connect(db_path)
    try:
        conn.execute("DELETE FROM incidents")
        conn.commit()
    finally:
        conn.close()
