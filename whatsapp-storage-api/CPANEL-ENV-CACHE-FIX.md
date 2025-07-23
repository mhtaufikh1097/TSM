# Solution for cPanel Environment Cache Issue

## Problem
Environment variables are cached in cPanel Node.js apps and not updating even after restart.

## Quick Solutions

### Option 1: Direct File Edit in cPanel
1. Go to cPanel File Manager
2. Navigate to your application directory
3. Edit `server.js` directly
4. Find line ~56: `if (!apiKey || apiKey !== process.env.API_SECRET) {`
5. Replace with: `if (!apiKey || apiKey !== 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=') {`
6. Save and restart the app

### Option 2: Upload New server.js
1. Upload the new `whatsapp-storage-api-cpanel.zip` 
2. Extract and replace the old server.js
3. Restart Node.js app

### Option 3: Force Environment Refresh
1. Delete the Node.js app completely in cPanel
2. Create a new Node.js app
3. Set environment variables again
4. Upload files and start

### Option 4: Use .env file instead
1. Create `.env` file in application root:
```
API_SECRET=nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=
PORT=3001
NODE_ENV=production
```
2. Make sure server.js has `require('dotenv').config()` at the top

## Test Commands
After fixing, test with:
```bash
curl -H "X-API-Key: nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=" https://botlinko.biz.id/test-auth
```

Should return: `{"success":true,"message":"Authentication successful..."}`

## Current Status
- ✅ Server running
- ✅ Health check working  
- ❌ Environment variables cached/not loading
- 🔧 Need to force refresh or use hard-coded values
