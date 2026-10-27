#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 3
FastAPI server exposing the 4 endpoints from API_CONTRACT.md.

Run it (from the project root):
    python -m uvicorn src.server:app --reload

Endpoints:
    GET  /api/health       - quick "is the server up?" check (not in the contract)
    GET  /api/windows      - list anchored windows
    POST /api/anchor       - anchor new windows
    POST /api/verify       - verify current log vs ledger
    POST /api/tamper-demo  - demo-only: edit/delete a line in a window
    POST /api/reset-demo   - demo-only: reset working log + clear ledger

The request/response shapes here must stay identical to API_CONTRACT.md.
"""

import os
import sys
import shutil
from contextlib import asynccontextmanager
from typing import Optional

# Make the sibling engine modules importable whether this file is launched as
# "src.server:app" (uvicorn, from the project root) or run directly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from collector import collect_windows, build_chain, DEFAULT_WINDOW_SECONDS
import ledger
import verifier
import tamper

# ---- Configuration (environment variables, with safe defaults) --------------
LOG_PATH = os.environ.get("LOG_PATH", "data/server.log")
DB_PATH = os.environ.get("DB_PATH", ledger.DEFAULT_DB_PATH)
SAMPLE_PATH = os.environ.get("SAMPLE_PATH", "data/sample_auth.log")
LEDGER_TYPE = os.environ.get("LEDGER_TYPE", "local")
WINDOW_SECONDS = int(os.environ.get("WINDOW_SECONDS", DEFAULT_WINDOW_SECONDS))
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
IS_MOCK = LEDGER_TYPE != "testnet"


@asynccontextmanager
async def lifespan(app):
    # Startup banner / mock-mode warning (CLAUDE.md: warn at startup when mock).
    if IS_MOCK:
        print("[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).")
    else:
        print("[INFO] Ledger running in TESTNET mode (mock: false).")
    print(f"[INFO] log_path={LOG_PATH}  db_path={DB_PATH}  window_seconds={WINDOW_SECONDS}")
    print(f"[INFO] CORS allowed origin: {FRONTEND_ORIGIN}")
    ledger.init_db(DB_PATH)
    yield


app = FastAPI(title="Tamper-Proof Security Log Vault", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {"status": "ok", "mock": IS_MOCK, "ledger_type": LEDGER_TYPE}


@app.get("/api/windows")
def get_windows():
    rows = ledger.get_all_windows(DB_PATH)
    ledger_type = rows[0]["ledger_type"] if rows else LEDGER_TYPE
    return {
        "mock": ledger_type != "testnet",
        "ledger_type": ledger_type,
        "count": len(rows),
        "windows": rows,
    }


@app.post("/api/anchor")
def post_anchor(req: AnchorRequest = AnchorRequest()):
    log_path = req.log_path or LOG_PATH
    try:
        windows = collect_windows(log_path, WINDOW_SECONDS)
    except FileNotFoundError:
        return _error(400, f"log file not found: {log_path!r}")
    except ValueError as exc:
        return _error(400, str(exc))

    records = build_chain(windows, WINDOW_SECONDS)
    newly, already = ledger.anchor_windows(
        records, db_path=DB_PATH, ledger_type=LEDGER_TYPE
    )
    return {
        "mock": IS_MOCK,
        "ledger_type": LEDGER_TYPE,
        "newly_anchored": newly,
        "already_anchored": already,
        "total_windows": len(records),
        "chain_tip": records[-1]["chain_hash"] if records else None,
    }


@app.post("/api/verify")
def post_verify(req: VerifyRequest = VerifyRequest()):
    log_path = req.log_path or LOG_PATH
    try:
        return verifier.verify(log_path, db_path=DB_PATH, window_seconds=WINDOW_SECONDS)
    except FileNotFoundError:
        return _error(400, f"log file not found: {log_path!r}")
    except ValueError as exc:
        return _error(400, str(exc))


@app.post("/api/tamper-demo")
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


@app.post("/api/reset-demo")
def post_reset():
    if not os.path.exists(SAMPLE_PATH):
        return _error(400, f"sample log not found: {SAMPLE_PATH!r}")
    os.makedirs(os.path.dirname(LOG_PATH) or ".", exist_ok=True)
    shutil.copyfile(SAMPLE_PATH, LOG_PATH)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    ledger.init_db(DB_PATH)
    return {"mock": IS_MOCK, "status": "reset", "log_path": LOG_PATH}
