#!/bin/bash
# Double-click this file to launch FC Manager.
# It serves the game folder locally and opens it in your browser.

cd "$(dirname "$0")" || exit 1
PORT=8765

# If the port is busy, walk up until we find a free one.
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo ""
echo "  ⚽  FC MANAGER"
echo "  ----------------------------------------"
echo "  Starting on http://localhost:$PORT"
echo ""
echo "  Keep this window open while you play."
echo "  Close it (or press Ctrl+C) to quit."
echo ""

python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!

# Give the server a moment, then open the game.
sleep 1
open "http://localhost:$PORT/index.html"

# Shut the server down cleanly when this window closes.
trap 'kill $SERVER_PID 2>/dev/null' EXIT
wait $SERVER_PID
