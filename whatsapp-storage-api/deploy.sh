#!/bin/bash

# WhatsApp Storage API Deployment Script for cPanel
# This script helps deploy the API to cPanel hosting

echo "🚀 WhatsApp Storage API - cPanel Deployment Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the whatsapp-storage-api directory."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."

# Create temporary deployment directory
DEPLOY_DIR="whatsapp-storage-api-deploy"
rm -rf $DEPLOY_DIR
mkdir $DEPLOY_DIR

# Copy necessary files
cp package.json $DEPLOY_DIR/
cp server.js $DEPLOY_DIR/
cp README.md $DEPLOY_DIR/
cp test.js $DEPLOY_DIR/

# Create .htaccess for cPanel
cat > $DEPLOY_DIR/.htaccess << 'EOF'
# Enable Node.js application
RewriteEngine on

# Handle Angular and other framework routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ server.js [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Disable server signature
ServerSignature Off

# Hide sensitive files
<Files ~ "^\.">
    Order allow,deny
    Deny from all
</Files>

<Files ~ "(package\.json|\.md)$">
    Order allow,deny
    Deny from all
</Files>
EOF

# Create startup.js for cPanel Node.js apps
cat > $DEPLOY_DIR/startup.js << 'EOF'
// Startup file for cPanel Node.js application
const app = require('./server.js');

const PORT = process.env.PORT || 3001;

if (app && typeof app.listen === 'function') {
    app.listen(PORT, () => {
        console.log(`WhatsApp Storage API running on port ${PORT}`);
    });
} else {
    // If server.js exports the app, start it
    console.log('Server started from startup.js');
}
EOF

# Create environment template
cat > $DEPLOY_DIR/.env.example << 'EOF'
# API Configuration
API_SECRET=your-super-secret-api-key-here
PORT=0

# cPanel Configuration
NODE_ENV=production
CPANEL_PORT=0

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CREDENTIALS_PATH=./credentials

# Security
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WhatsApp Session Storage
SESSION_ENCRYPTION_KEY=your-32-character-encryption-key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/api.log
EOF

# Create installation instructions
cat > $DEPLOY_DIR/INSTALL.md << 'EOF'
# cPanel Installation Instructions

## Step 1: Upload Files
1. Compress the whatsapp-storage-api-deploy folder to a ZIP file
2. Upload the ZIP file to your cPanel File Manager
3. Extract the files to your desired directory (e.g., /public_html/api/)

## Step 2: Setup Node.js Application (cPanel)
1. Go to cPanel > Node.js Apps
2. Click "Create Application"
3. Select Node.js version (14+ recommended)
4. Set Application Root: /public_html/api (or your chosen directory)
5. Set Application URL: api.yourdomain.com (or subdirectory)
6. Set Startup File: startup.js
7. Click "Create"

## Step 3: Install Dependencies
1. In Node.js Apps, click "Run NPM Install" for your application
2. Wait for installation to complete

## Step 4: Environment Configuration
1. In your application directory, copy .env.example to .env
2. Edit .env file with your settings:
   ```
   API_KEY=your-unique-secret-key
   PORT=3001
   MAX_FILE_SIZE=10485760
   ```

## Step 5: Start Application
1. In Node.js Apps, click "Start" for your application
2. Your API will be available at your configured URL

## Step 6: Test API
1. Visit: https://yourdomain.com/api/health
2. Should return: {"status": "ok", "timestamp": "..."}

## Troubleshooting
- Check cPanel Error Logs if the application fails to start
- Ensure all file permissions are correct (644 for files, 755 for directories)
- Verify Node.js version compatibility
- Check that the startup file is correctly configured
EOF

# Create ZIP package
echo "🗜️ Creating deployment package..."
cd $DEPLOY_DIR
zip -r "../whatsapp-storage-api-cpanel.zip" .
cd ..

echo "✅ Deployment package created: whatsapp-storage-api-cpanel.zip"
echo ""
echo "📋 Next Steps:"
echo "1. Upload whatsapp-storage-api-cpanel.zip to your cPanel"
echo "2. Extract the files to your desired directory"
echo "3. Follow the instructions in INSTALL.md"
echo "4. Configure your environment variables"
echo "5. Start the Node.js application in cPanel"
echo ""
echo "📁 Package contents:"
echo "   - server.js (main application)"
echo "   - package.json (dependencies)"
echo "   - startup.js (cPanel startup file)"
echo "   - .htaccess (Apache configuration)"
echo "   - .env.example (environment template)"
echo "   - INSTALL.md (installation guide)"
echo "   - test.js (API testing script)"
echo ""
echo "🎉 Ready for deployment!"

# Cleanup
rm -rf $DEPLOY_DIR
