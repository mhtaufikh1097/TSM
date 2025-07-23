# Port Configuration Solutions for cPanel

## Problem: Port 3001 Already in Use

The error `EADDRINUSE: address already in use :::3001` indicates that port 3001 is already occupied on the cPanel server.

## Solutions:

### 1. Use Dynamic Port Assignment
Update your server.js to use a different port:

```javascript
const PORT = process.env.PORT || process.env.NODE_PORT || Math.floor(Math.random() * 10000) + 40000;
```

### 2. Use cPanel Node.js App Port
Most cPanel hosting providers assign a specific port automatically. Update server.js:

```javascript
// For cPanel deployment - use assigned port
const PORT = process.env.PORT || process.env.CPANEL_PORT || 3001;
```

### 3. Check Available Ports
Before starting, check what ports are available:

```bash
# Check what's using port 3001
netstat -tulpn | grep :3001

# Find available ports
for port in {3001..3010}; do ! nc -z localhost $port && echo "Port $port is available"; done
```

### 4. Update Environment Configuration
Create a new .env file with dynamic port:

```env
PORT=0
NODE_ENV=production
API_SECRET=nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=
```

Setting PORT=0 lets Node.js choose an available port automatically.

### 5. cPanel-Specific Configuration
For cPanel Node.js apps, create a startup.js file:

```javascript
const app = require('./server.js');
const PORT = process.env.PORT || 0; // Let system assign port

if (typeof app.listen === 'function') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${server.address().port}`);
  });
} else {
  console.log('App already started by server.js');
}
```

## Recommended Fix:

1. Change PORT to 0 or use process.env.PORT
2. Update cPanel Node.js app settings
3. Use the assigned URL from cPanel control panel
4. Test with the actual deployed URL

## Next Steps:
1. Check cPanel Node.js Apps section for assigned URL/port
2. Update test.js with the correct production URL
3. Restart the Node.js application in cPanel
