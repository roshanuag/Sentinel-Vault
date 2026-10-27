"""Shared test fixtures. Puts src/ on the path and builds a known sample log."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

# 12 lines, 4 per 5-minute window -> windows at 10:00, 10:05, 10:10.
SAMPLE = """2026-10-27 10:00:01 server sshd[1201]: Accepted password for alice from 192.168.10.23 port 54122 ssh2
2026-10-27 10:01:15 server sshd[1205]: Failed password for bob from 192.168.10.88 port 51233 ssh2
2026-10-27 10:02:40 server sudo: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/usr/bin/apt update
2026-10-27 10:04:59 server sshd[1211]: Accepted publickey for carol from 10.0.0.14 port 49002 ssh2
2026-10-27 10:05:03 server sshd[1230]: Failed password for root from 203.0.113.9 port 40111 ssh2
2026-10-27 10:06:30 server sshd[1231]: Failed password for root from 203.0.113.9 port 40115 ssh2
2026-10-27 10:08:00 server sshd[1240]: Accepted password for bob from 192.168.10.88 port 51290 ssh2
2026-10-27 10:09:45 server sudo: bob : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
2026-10-27 10:10:10 server sshd[1255]: Accepted password for alice from 192.168.10.23 port 54130 ssh2
2026-10-27 10:11:22 server sshd[1260]: Failed password for dave from 198.51.100.7 port 33780 ssh2
2026-10-27 10:13:00 server sshd[1261]: Failed password for dave from 198.51.100.7 port 33784 ssh2
2026-10-27 10:14:30 server sshd[1270]: Accepted publickey for carol from 10.0.0.14 port 49020 ssh2
"""


@pytest.fixture
def sample_log(tmp_path):
    p = tmp_path / "server.log"
    p.write_text(SAMPLE, encoding="utf-8")
    return str(p)


@pytest.fixture
def db_path(tmp_path):
    return str(tmp_path / "ledger.sqlite")
