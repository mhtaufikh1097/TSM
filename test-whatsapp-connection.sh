#!/bin/bash

echo "🧪 Testing WhatsApp Connection & QR Code Improvements"
echo "=================================================="

# Start server in background
echo "🚀 Starting development server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

echo ""
echo "📊 Testing connection diagnostics..."
curl -s http://localhost:3000/api/whatsapp/refresh | jq '.' || echo "JSON parsing failed"

echo ""
echo "🔄 Testing QR refresh (if needed)..."
curl -s -X POST http://localhost:3000/api/whatsapp/refresh | jq '.' || echo "JSON parsing failed"

echo ""
echo "📱 Admin interface available at:"
echo "   http://localhost:3000/admin/whatsapp"

echo ""
echo "🔧 Manual testing commands:"
echo "   curl -X GET http://localhost:3000/api/whatsapp/refresh    # Get diagnostics"
echo "   curl -X POST http://localhost:3000/api/whatsapp/refresh   # Force refresh QR"

echo ""
echo "⏹️  Press Ctrl+C to stop the server"
echo "   Server PID: $SERVER_PID"

# Keep script running
wait $SERVER_PID
