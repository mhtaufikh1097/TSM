#!/bin/bash

echo "🔧 WhatsApp Stream Error 515 Recovery Tool"
echo "========================================"

# Check if server is running
if ! curl -s http://localhost:3000/api/whatsapp/refresh > /dev/null; then
    echo "❌ Server not running. Please start with: npm run dev"
    exit 1
fi

echo "📊 Current connection status:"
curl -s http://localhost:3000/api/whatsapp/refresh | jq '.data // .'

echo ""
echo "🔧 Initiating Stream Error 515 recovery..."

# Trigger Stream Error 515 recovery
RESPONSE=$(curl -s -X POST http://localhost:3000/api/whatsapp/refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "stream515"}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Recovery initiated successfully"
    echo ""
    echo "⏳ Please wait 60-90 seconds for recovery to complete..."
    echo "📱 New QR code will be generated automatically"
    echo "🔍 Monitor progress at: http://localhost:3000/admin/whatsapp"
else
    echo "❌ Recovery failed"
    echo "Response: $RESPONSE"
    
    echo ""
    echo "🔄 Alternative: Manual refresh"
    curl -s -X POST http://localhost:3000/api/whatsapp/refresh | jq '.'
fi

echo ""
echo "🛠️  Manual recovery commands:"
echo "   curl -X POST http://localhost:3000/api/whatsapp/refresh -H 'Content-Type: application/json' -d '{\"action\":\"stream515\"}'"
echo "   curl -X POST http://localhost:3000/api/whatsapp/refresh  # Regular refresh"
echo "   curl -X GET http://localhost:3000/api/whatsapp/refresh   # Get diagnostics"
