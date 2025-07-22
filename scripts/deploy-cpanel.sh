#!/bin/bash
# TSM cPanel Deployment Script
# Author: AI Assistant
# Date: $(date +%Y-%m-%d)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
PROJECT_NAME="TSM"
DEPLOY_DIR="cpanel-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"

print_step "Starting TSM cPanel deployment preparation..."

# Step 1: Clean previous deployment
if [ -d "$DEPLOY_DIR" ]; then
    print_warning "Removing previous deployment directory..."
    rm -rf "$DEPLOY_DIR"
fi

mkdir -p "$DEPLOY_DIR"
print_success "Created deployment directory"

# Step 2: Build the project
print_step "Building Next.js application..."
npm run build
print_success "Build completed successfully"

# Step 3: Generate Prisma Client
print_step "Generating Prisma Client..."
npx prisma generate
print_success "Prisma Client generated"

# Step 4: Copy essential files
print_step "Copying project files..."

# Copy directories
cp -r .next "$DEPLOY_DIR/"
cp -r public "$DEPLOY_DIR/"
cp -r prisma "$DEPLOY_DIR/"
cp -r node_modules "$DEPLOY_DIR/" 2>/dev/null || print_warning "Skipping node_modules (will install on server)"

# Copy configuration files
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || cp yarn.lock "$DEPLOY_DIR/" 2>/dev/null || echo "No lock file found"
cp next.config.js "$DEPLOY_DIR/"
cp tailwind.config.ts "$DEPLOY_DIR/" 2>/dev/null || cp tailwind.config.js "$DEPLOY_DIR/" 2>/dev/null || echo "No tailwind config found"
cp postcss.config.mjs "$DEPLOY_DIR/"
cp tsconfig.json "$DEPLOY_DIR/" 2>/dev/null || echo "No tsconfig found"
cp next-env.d.ts "$DEPLOY_DIR/" 2>/dev/null || echo "No next-env.d.ts found"
cp .env.production "$DEPLOY_DIR/.env" 2>/dev/null || print_warning "No .env.production found, copying .env"
cp .env "$DEPLOY_DIR/" 2>/dev/null || print_warning "No .env file found"

print_success "Essential files copied"

# Step 5: Create cPanel-specific files
print_step "Creating cPanel-specific configuration..."

# Create optimized server.js for cPanel
cat > "$DEPLOY_DIR/server.js" << 'EOF'
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false // Always production for cPanel
const hostname = 'localhost'
const port = parseInt(process.env.PORT, 10) || 3000

console.log('🚀 Starting WIKA TSM Server...')
console.log('Environment: production')
console.log('Port:', port)

const app = next({ 
  dev, 
  hostname, 
  port,
  conf: {
    distDir: '.next',
    generateEtags: false,
    compress: true,
    poweredByHeader: false
  }
})

const handle = app.getRequestHandler()

console.log('📦 Preparing WIKA TSM application...')

app.prepare()
  .then(() => {
    console.log('✅ WIKA TSM application prepared successfully')
    
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        
        // Security headers
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-XSS-Protection', '1; mode=block')
        
        // Handle API routes with CORS
        if (parsedUrl.pathname?.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        }
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }
        
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('❌ Error handling request:', req.url, err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        }))
      }
    })
    
    server.on('error', (err) => {
      console.error('❌ Server error:', err)
      process.exit(1)
    })
    
    server.listen(port, hostname, () => {
      console.log(`✅ WIKA TSM Server ready on http://${hostname}:${port}`)
      console.log('🌐 Application is now accessible')
    })
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('⚠️ SIGTERM received, shutting down gracefully')
      server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
      })
    })
    
  })
  .catch((err) => {
    console.error('❌ Failed to prepare application:', err)
    process.exit(1)
  })
EOF

print_success "Server.js created"

# Create .htaccess for Apache
cat > "$DEPLOY_DIR/.htaccess" << 'EOF'
# WIKA TSM - Apache Configuration for cPanel
RewriteEngine On

# Force HTTPS (uncomment if SSL is configured)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle Node.js application
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /server.js [L,QSA]

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Cache Control for Static Assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType text/html "access plus 2 hours"
</IfModule>

# Security - Hide sensitive files
<Files ".env*">
    Order allow,deny
    Deny from all
</Files>

<Files "*.config.*">
    Order allow,deny
    Deny from all
</Files>

# Error Pages (optional)
# ErrorDocument 404 /404.html
# ErrorDocument 500 /500.html
EOF

print_success ".htaccess created"

# Create cPanel deployment configuration
cat > "$DEPLOY_DIR/.cpanel.yml" << 'EOF'
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/$USER/public_html/
    - echo "Deploying WIKA TSM to cPanel..."
    - /bin/cp -R * $DEPLOYPATH
    - cd $DEPLOYPATH
    - echo "Installing production dependencies..."
    - npm install --production --no-audit
    - echo "Generating Prisma Client..."
    - npx prisma generate
    - echo "Setting permissions..."
    - chmod 644 *.js *.json
    - chmod 755 public/
    - chmod 600 .env
    - echo "✅ WIKA TSM deployed successfully!"
EOF

print_success ".cpanel.yml created"

# Create environment template
cat > "$DEPLOY_DIR/.env.example" << 'EOF'
# WIKA TSM Production Environment Configuration
# Copy this to .env and update with your actual values

# Database Configuration (MySQL from cPanel)
DATABASE_URL="mysql://cpanel_username:password@localhost:3306/database_name?connection_limit=5&pool_timeout=20"

# Application URLs (Update with your domain)
NEXTAUTH_URL="https://yourdomain.com"
APP_URL="https://yourdomain.com"

# WhatsApp Integration
WHATSAPP_WEBHOOK_URL="https://yourdomain.com/api/whatsapp/webhook"

# Security (Generate a new secret key)
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
AUTH_TRUST_HOST=true

# Application
APP_NAME="WIKA TSM System"
NODE_ENV=production

# Server Configuration
PORT=3000
HOSTNAME=localhost

# Optional: Email Configuration (if using email features)
# SMTP_HOST=""
# SMTP_PORT=""
# SMTP_USER=""
# SMTP_PASSWORD=""
EOF

print_success "Environment template created"

# Step 6: Create installation instructions
cat > "$DEPLOY_DIR/INSTALL_CPANEL.md" << 'EOF'
# WIKA TSM - cPanel Installation Guide

## Quick Installation Steps

### 1. Upload Files
- Upload all files to your cPanel `public_html` directory
- Or extract the deployment ZIP to `public_html`

### 2. Setup Database
1. **cPanel → MySQL Databases**
2. **Create Database**: `yourdomain_tsm`
3. **Create User**: `yourdomain_tsm` with strong password
4. **Add User to Database** with ALL privileges
5. **Import Schema**: Use phpMyAdmin to import your Prisma schema

### 3. Configure Environment
1. Copy `.env.example` to `.env`
2. Update database credentials:
   ```
   DATABASE_URL="mysql://yourdomain_tsm:PASSWORD@localhost:3306/yourdomain_tsm"
   ```
3. Update domain URLs:
   ```
   NEXTAUTH_URL="https://yourdomain.com"
   APP_URL="https://yourdomain.com"
   ```

### 4. Setup Node.js Application
1. **cPanel → Node.js Apps**
2. **Create Application**:
   - Node.js Version: 18.17.0 or latest LTS
   - Application Mode: Production
   - Application Root: public_html
   - Application URL: yourdomain.com
   - Application Startup File: server.js
3. **Add Environment Variables** from your `.env` file
4. **Save and Start**

### 5. Database Migration
```bash
# SSH into your cPanel (if available)
cd public_html
npx prisma db push
```

Or use phpMyAdmin to import the schema manually.

### 6. SSL Certificate
1. **cPanel → SSL/TLS**
2. Enable **Let's Encrypt** (free)
3. **Force HTTPS Redirect**

### 7. Test Application
- Visit: `https://yourdomain.com`
- Login with admin credentials
- Test WhatsApp connection in Admin → WhatsApp

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check database user privileges
- Ensure database server is accessible

### Node.js Application Won't Start
- Check Node.js version compatibility
- Verify environment variables
- Check error logs in cPanel

### WhatsApp Connection Issues
- Ensure webhook URL is accessible
- Check SSL certificate
- Verify firewall settings

## Support
- Check cPanel error logs
- Monitor application performance
- Keep dependencies updated

---
**WIKA TSM System** - Incident Management & WhatsApp Integration
EOF

print_success "Installation guide created"

# Step 7: Create deployment package
print_step "Creating deployment package..."

cd "$DEPLOY_DIR"
zip -r "../${PROJECT_NAME}_cpanel_${TIMESTAMP}.zip" . -x "*.DS_Store" "node_modules/.cache/*"
cd ..

print_success "Deployment package created: ${PROJECT_NAME}_cpanel_${TIMESTAMP}.zip"

# Step 8: Display summary
echo ""
echo "=================================================="
echo -e "${BLUE}🎉 WIKA TSM cPanel Deployment Ready!${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}📦 Package: ${PROJECT_NAME}_cpanel_${TIMESTAMP}.zip${NC}"
echo -e "${GREEN}📁 Size: $(du -h "${PROJECT_NAME}_cpanel_${TIMESTAMP}.zip" | cut -f1)${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Upload ZIP file to cPanel File Manager"
echo "2. Extract to public_html directory"
echo "3. Setup MySQL database in cPanel"
echo "4. Configure .env with database credentials"
echo "5. Setup Node.js application in cPanel"
echo "6. Enable SSL certificate"
echo "7. Test the application"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "- Installation guide: cpanel-deploy/INSTALL_CPANEL.md"
echo "- Environment template: cpanel-deploy/.env.example"
echo ""
echo -e "${GREEN}✅ Deployment preparation completed successfully!${NC}"
echo ""

# Step 9: Optional - display file structure
print_step "Deployment package contents:"
echo "$(cd "$DEPLOY_DIR" && find . -type f | head -20)"
if [ $(cd "$DEPLOY_DIR" && find . -type f | wc -l) -gt 20 ]; then
    echo "... and $(($(cd "$DEPLOY_DIR" && find . -type f | wc -l) - 20)) more files"
fi

print_success "TSM cPanel deployment script completed!"
