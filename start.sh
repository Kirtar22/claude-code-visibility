#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  Claude Code Visibility Dashboard"
echo "  ─────────────────────────────────"
echo ""

# Backend
echo "  Installing backend dependencies..."
cd "$ROOT/server"
pip3 install -r requirements.txt -q

# Frontend
echo "  Installing frontend dependencies..."
cd "$ROOT/dashboard"
npm install --silent

# Start servers
echo ""
echo "  Starting servers..."
cd "$ROOT/server"
uvicorn main:app --host 127.0.0.1 --port 8000 --reload --log-level warning &
BACKEND_PID=$!

cd "$ROOT/dashboard"
npm run dev &
FRONTEND_PID=$!

# Wait for backend to be ready
sleep 2
echo ""
echo "  ✓ API:       http://localhost:8000"
echo "  ✓ Dashboard: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cleanup() {
    echo ""
    echo "  Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

wait
