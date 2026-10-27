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


def test_rate_limit_returns_429(client):
    limit = server.RATE_LIMIT_MAX
    codes = [client.post("/api/anchor", headers=KEY).status_code for _ in range(limit + 1)]
    assert codes[:limit] == [200] * limit
    assert codes[limit] == 429
    assert "error" in client.post("/api/anchor", headers=KEY).json()
