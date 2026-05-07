#!/bin/bash
# Start both the Flask backend and React frontend dev server

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting YourBank backend (Flask API on :5000)..."
cd "$ROOT/backend"
python app.py &
BACKEND_PID=$!

echo "Starting YourBank frontend (React on :5173)..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "====================================="
echo "  YourBank is running!"
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:5000"
echo "====================================="
echo "Press Ctrl+C to stop both servers"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
