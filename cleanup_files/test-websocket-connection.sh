#!/bin/bash

echo "🔍 Testing WebSocket Connection with Phase 3 Timing Fixes"
echo "=================================================="

# Test basic WebSocket handshake
echo "📡 Testing WebSocket handshake to localhost:8000..."
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  -H "Authorization: Bearer test-token" \
  http://localhost:8000/ws/checkins/

echo -e "\n"
echo "🌐 Frontend accessible at: http://localhost:3000"
echo "🔌 Backend WebSocket at: ws://localhost:8000/ws/checkins/"
echo "⚡ Connection timing fixes applied in Phase 3"
