"""HTTP API tests: security headers, API-key auth, rate limiting, and the flow."""
import os
import sys
import tempfile

# Configure the server via environment BEFORE importing it (the module reads
# these at import time). Use an isolated temp dir so tests never touch data/.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_TMP = tempfile.mkdtemp()
os.environ["LOG_PATH"] = os.path.join(_TMP, "server.log")
os.environ["DB_PATH"] = os.path.join(_TMP, "ledger.sqlite")
os.environ["SAMPLE_PATH"] = os.path.join(_ROOT, "data", "sample_auth.log")
os.environ["VAULT_API_KEY"] = "test-key"
os.environ["LEDGER_BACKEND"] = "local"

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(_ROOT, "src"))
import server  # noqa: E402

KEY = {"X-API-Key": "test-key"}


@pytest.fixture
def client():
    # Context manager runs the lifespan (builds the anchor backend).
    with TestClient(server.app) as c:
        yield c


@pytest.fixture(autouse=True)
def _clean(client):
    server.reset_rate_limits()
    r = client.post("/api/reset-demo", headers=KEY)
    assert r.status_code == 200
    yield


def test_post_without_api_key_is_rejected(client):
    r = client.post("/api/anchor")
    assert r.status_code == 401
    assert "error" in r.json()


def test_post_with_wrong_api_key_is_rejected(client):
    r = client.post("/api/anchor", headers={"X-API-Key": "nope"})
    assert r.status_code == 401


def test_get_endpoints_need_no_key(client):
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/windows").status_code == 200


def test_security_headers_present(client):
    h = client.get("/api/health").headers
    assert h["X-Frame-Options"] == "DENY"
    assert h["X-Content-Type-Options"] == "nosniff"
    assert "Strict-Transport-Security" in h


def test_anchor_verify_tamper_flow(client):
    assert client.post("/api/anchor", headers=KEY).json()["total_windows"] == 3
    assert client.post("/api/verify", headers=KEY).json()["overall_status"] == "INTACT"

    t = client.post("/api/tamper-demo", headers=KEY, json={"window_index": 0, "action": "modify"})
    assert t.status_code == 200

    v = client.post("/api/verify", headers=KEY).json()
    assert v["overall_status"] == "COMPROMISED"
    w0 = next(w for w in v["windows"] if w["index"] == 0)
    assert w0["status"] == "TAMPERED"


def test_delete_window_shows_missing(client):
    assert client.post("/api/anchor", headers=KEY).json()["total_windows"] == 3
    assert client.post("/api/verify", headers=KEY).json()["overall_status"] == "INTACT"

    t = client.post(
        "/api/tamper-demo", headers=KEY,
        json={"window_index": 1, "action": "delete_window"},
    )
    assert t.status_code == 200
    body = t.json()
    assert body["action"] == "delete_window"
    assert body["target_window_index"] == 1
    assert body["lines_removed"] >= 1
    assert body["line_changed"] is None

    v = client.post("/api/verify", headers=KEY).json()
    assert v["overall_status"] == "COMPROMISED"
    w1 = next(w for w in v["windows"] if w["index"] == 1)
    assert w1["status"] == "MISSING"
    assert w1["current_log_hash"] is None
    assert v["summary"]["missing"] == 1


def test_rate_limit_returns_429(client):
    limit = server.RATE_LIMIT_MAX
    codes = [client.post("/api/anchor", headers=KEY).status_code for _ in range(limit + 1)]
    assert codes[:limit] == [200] * limit
    assert codes[limit] == 429
    assert "error" in client.post("/api/anchor", headers=KEY).json()


def test_tamper_demo_ignores_log_path_and_only_touches_demo_log(client, tmp_path):
    # A canary file an attacker tries to target by smuggling in a log_path.
    canary = tmp_path / "canary.log"
    canary.write_text(
        "2026-10-27 10:00:01 server sshd[1]: do not touch this file\n", encoding="utf-8"
    )
    canary_before = canary.read_text(encoding="utf-8")
    with open(server.LOG_PATH, encoding="utf-8") as fh:
        demo_before = fh.read()

    # The request still sends a different log_path (pointing at the canary).
    r = client.post(
        "/api/tamper-demo",
        headers=KEY,
        json={"log_path": str(canary), "window_index": 0, "action": "delete"},
    )
    assert r.status_code == 200

    # The attacker-supplied log_path is ignored: the canary is untouched ...
    assert canary.read_text(encoding="utf-8") == canary_before
    # ... and the server's own demo log (LOG_PATH) is what actually changed.
    with open(server.LOG_PATH, encoding="utf-8") as fh:
        assert fh.read() != demo_before


def test_anchor_ignores_log_path_and_anchors_only_the_demo_log(client, tmp_path):
    from collector import collect_windows, build_chain

    # A canary log with DIFFERENT content (so different fingerprints).
    canary = tmp_path / "canary.log"
    canary.write_text(
        "2026-10-27 10:00:05 server sshd[9]: canary content alpha\n"
        "2026-10-27 10:05:05 server sshd[9]: canary content bravo\n"
        "2026-10-27 10:10:05 server sshd[9]: canary content charlie\n",
        encoding="utf-8",
    )
    demo_hash0 = build_chain(collect_windows(server.LOG_PATH, 300), 300)[0]["log_hash"]
    canary_hash0 = build_chain(collect_windows(str(canary), 300), 300)[0]["log_hash"]
    assert demo_hash0 != canary_hash0  # sanity: the two logs fingerprint differently

    # Anchor while smuggling in a different log_path.
    r = client.post("/api/anchor", headers=KEY, json={"log_path": str(canary)})
    assert r.status_code == 200
    assert r.json()["total_windows"] == 3  # the demo log's window count

    # The ledger holds the DEMO log's fingerprint, not the canary's.
    # (GET /api/windows returns raw ledger rows, keyed "window_index".)
    windows = client.get("/api/windows").json()["windows"]
    stored_hash0 = next(w for w in windows if w["window_index"] == 0)["log_hash"]
    assert stored_hash0 == demo_hash0
    assert stored_hash0 != canary_hash0
