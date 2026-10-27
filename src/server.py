#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - FastAPI server (Milestones 3 + 4).

Run it (from the project root):
    python -m uvicorn src.server:app --reload

The active anchor backend is chosen at startup by the LEDGER_BACKEND env var
(local | testnet); see src/anchors.py. If testnet can't be built it falls back
to local. The request/response shapes stay identical to API_CONTRACT.md and do
not depend on which backend is active.

Endpoints:
    GET  /api/health       - quick "is the server up?" check (not in the contract)
    GET  /api/windows      - list anchored windows
    POST /api/anchor       - anchor new windows
    POST /api/verify       - verify current log vs the anchor
    POST /api/tamper-demo  - demo-only: edit/delete a line in a window
    POST /api/reset-demo   - demo-only: reset working log + clear local ledger/cache
"""

import os
import sys
import time
import shutil
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Optional

# Make the sibling engine modules importable whether this file is launched as
# "src.server:app" (uvicorn, from the project root) or run directly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from collector import collect_windows, build_chain, DEFAULT_WINDOW_SECONDS
import ledger
import anchors
import verifier
import tamper

# ---- Configuration (environment variables, with safe defaults) --------------
LOG_PATH = os.environ.get("LOG_PATH", "data/server.log")
DB_PATH = os.environ.get("DB_PATH", ledger.DEFAULT_DB_PATH)
SAMPLE_PATH = os.environ.get("SAMPLE_PATH", "data/sample_auth.log")
WINDOW_SECONDS = int(os.environ.get("WINDOW_SECONDS", DEFAULT_WINDOW_SECONDS))
# Comma-separated list of allowed frontend origins (frontend/ on 5173, frontend2/ on 5174).
FRONTEND_ORIGIN = os.environ.get(
    "FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:5174"
)
ALLOWED_ORIGINS = [o.strip() for o in FRONTEND_ORIGIN.split(",") if o.strip()]

# API key required on state-changing (POST) requests.
VAULT_API_KEY = os.environ.get("VAULT_API_KEY", "demo-key-123")
# Rate limit for the abuse-prone demo endpoints (per client IP).
RATE_LIMIT_MAX = int(os.environ.get("RATE_LIMIT_MAX", "10"))
RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", "60"))

# The active anchor backend, built once at startup.
_anchor = None


@asynccontextmanager
async def lifespan(app):
    global _anchor
    _anchor = anchors.get_anchor(db_path=DB_PATH)
    # Startup banner / mock-mode warning (CLAUDE.md: warn at startup when mock).
    if _anchor.is_mock:
        print("[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).")
    else:
        print(f"[INFO] Ledger running in TESTNET / EVM mode (mock: false) "
              f"at {getattr(_anchor, 'address', 'unknown')}.")
    print(f"[INFO] log_path={LOG_PATH}  db_path={DB_PATH}  window_seconds={WINDOW_SECONDS}")
    print(f"[INFO] CORS allowed origin: {FRONTEND_ORIGIN}")
    yield


app = FastAPI(title="Tamper-Proof Security Log Vault", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers on every response. A vault that protects logs should also
# protect its own API surface. (HSTS only takes effect over HTTPS; harmless on
# plain HTTP. The CSP uses frame-ancestors only, so the /docs page still loads.)
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "frame-ancestors 'none'",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
}


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


# ---- API key + rate limiting ------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def _http_exception_handler(request, exc):
    # Keep the {"error": ...} response shape for raised HTTPExceptions.
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    """Reject state-changing requests without the correct X-API-Key header."""
    if x_api_key != VAULT_API_KEY:
        raise StarletteHTTPException(status_code=401, detail="invalid or missing X-API-Key")


# In-memory sliding-window rate limiter: {bucket:ip -> [timestamps]}.
_rate_hits = defaultdict(list)


def _rate_limit(bucket, request):
    ip = request.client.host if request.client else "unknown"
    hits = _rate_hits[f"{bucket}:{ip}"]
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    while hits and hits[0] < cutoff:
        hits.pop(0)
    if len(hits) >= RATE_LIMIT_MAX:
        raise StarletteHTTPException(
            status_code=429,
            detail=f"rate limit exceeded: max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s",
        )
    hits.append(now)


def rate_limit_anchor(request: Request):
    _rate_limit("anchor", request)


def rate_limit_tamper(request: Request):
    _rate_limit("tamper", request)


def reset_rate_limits():
    """Clear rate-limit counters (used by tests)."""
    _rate_hits.clear()


# ---- Request models ---------------------------------------------------------
class AnchorRequest(BaseModel):
    log_path: Optional[str] = None


class VerifyRequest(BaseModel):
    log_path: Optional[str] = None


class TamperRequest(BaseModel):
    log_path: Optional[str] = None
    window_index: int
    action: str


def _error(status_code, message):
    """Error response shaped as {"error": "..."} per API_CONTRACT.md."""
    return JSONResponse(status_code=status_code, content={"error": message})


# ---- Endpoints --------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "mock": _anchor.is_mock, "ledger_type": _anchor.ledger_type}


@app.get("/api/windows")
def get_windows():
    rows = _anchor.get_windows()
    return {
        "mock": _anchor.is_mock,
        "ledger_type": _anchor.ledger_type,
        "count": len(rows),
        "windows": rows,
    }


@app.post("/api/anchor", dependencies=[Depends(require_api_key), Depends(rate_limit_anchor)])
def post_anchor(req: AnchorRequest = AnchorRequest()):
    log_path = req.log_path or LOG_PATH
    try:
        windows = collect_windows(log_path, WINDOW_SECONDS)
    except FileNotFoundError:
        return _error(400, f"log file not found: {log_path!r}")
    except ValueError as exc:
        return _error(400, str(exc))

    records = build_chain(windows, WINDOW_SECONDS)
    newly, already = _anchor.anchor(records)
    return {
        "mock": _anchor.is_mock,
        "ledger_type": _anchor.ledger_type,
        "newly_anchored": newly,
        "already_anchored": already,
        "total_windows": len(records),
        "chain_tip": records[-1]["chain_hash"] if records else None,
    }


@app.post("/api/verify", dependencies=[Depends(require_api_key)])
def post_verify(req: VerifyRequest = VerifyRequest()):
    log_path = req.log_path or LOG_PATH
    try:
        return verifier.verify(log_path, _anchor, window_seconds=WINDOW_SECONDS)
    except FileNotFoundError:
        return _error(400, f"log file not found: {log_path!r}")
    except ValueError as exc:
        return _error(400, str(exc))


@app.post("/api/tamper-demo", dependencies=[Depends(require_api_key), Depends(rate_limit_tamper)])
def post_tamper(req: TamperRequest):
    log_path = req.log_path or LOG_PATH
    try:
        return tamper.tamper_line(
            log_path, req.window_index, req.action, window_seconds=WINDOW_SECONDS
        )
    except FileNotFoundError:
        return _error(400, f"log file not found: {log_path!r}")
    except (ValueError, IndexError) as exc:
        return _error(400, str(exc))


@app.post("/api/reset-demo", dependencies=[Depends(require_api_key)])
def post_reset():
    if not os.path.exists(SAMPLE_PATH):
        return _error(400, f"sample log not found: {SAMPLE_PATH!r}")
    os.makedirs(os.path.dirname(LOG_PATH) or ".", exist_ok=True)
    shutil.copyfile(SAMPLE_PATH, LOG_PATH)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    ledger.init_db(DB_PATH)
    if os.path.exists(anchors.DEFAULT_CACHE_DB):
        os.remove(anchors.DEFAULT_CACHE_DB)
    return {"mock": _anchor.is_mock, "status": "reset", "log_path": LOG_PATH}
