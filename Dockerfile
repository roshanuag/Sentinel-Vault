# SentinelVault backend — production image for the FastAPI service.
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    LEDGER_BACKEND=local

WORKDIR /app

# Install dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code and assets.
COPY src/ ./src/
COPY contracts/ ./contracts/
COPY data/ ./data/

# Run as an unprivileged user (defense in depth).
RUN useradd --create-home --uid 10001 vault && chown -R vault:vault /app
USER vault

EXPOSE 8000

# Liveness check using the stdlib only (no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2).status==200 else 1)"

# Seed the demo working log + empty ledger, then start the API.
CMD ["sh", "-c", "python src/vault.py init-demo && uvicorn src.server:app --host 0.0.0.0 --port 8000"]
