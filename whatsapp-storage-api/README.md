# WhatsApp Storage API

Simple Node.js API for file upload and WhatsApp credential storage, designed for cPanel deployment.

## Features

- 🚀 **File Upload**: Single and multiple file upload with validation
- 💾 **WhatsApp Credentials Storage**: JSON-based credential management
- 🔒 **Security**: API key authentication, rate limiting, CORS protection
- 📁 **File Management**: Organized storage with metadata tracking
- ⚡ **Performance**: Compression and optimized for cPanel hosting
- 🛡️ **Error Handling**: Comprehensive error handling and logging

## Installation

1. **Download/Clone the project**
```bash
# If using git
git clone <repository-url>
cd whatsapp-storage-api

# Or download and extract the zip file
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your settings
nano .env
```

4. **Start the server**
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## Environment Configuration

### Required Settings
```env
# Server Configuration
PORT=3001
NODE_ENV=production
API_SECRET=your-super-secret-api-key-here

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads
CREDENTIALS_PATH=./credentials

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15

# WhatsApp Session Storage
SESSION_ENCRYPTION_KEY=your-32-character-encryption-key
```

## API Endpoints

### Authentication
All API endpoints require authentication via API key in header:
```
X-API-Key: your-api-secret-key
```
or
```
Authorization: Bearer your-api-secret-key
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp Storage API is running",
  "timestamp": "2025-07-23T00:00:00.000Z",
  "version": "1.0.0"
}
```

### File Upload Endpoints

#### Single File Upload
```http
POST /api/upload
Content-Type: multipart/form-data
X-API-Key: your-api-secret-key

Form Data:
- file: <file to upload>
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "originalName": "document.pdf",
    "filename": "file-1642819200000-123456789.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "uploadDate": "2025-07-23T00:00:00.000Z",
    "path": "./uploads/file-1642819200000-123456789.pdf"
  }
}
```

#### Multiple Files Upload
```http
POST /api/upload-multiple
Content-Type: multipart/form-data
X-API-Key: your-api-secret-key

Form Data:
- files: <file1>
- files: <file2>
- files: <file3>
```

### WhatsApp Credentials Endpoints

#### Save WhatsApp Credentials
```http
POST /api/whatsapp/credentials
Content-Type: application/json
X-API-Key: your-api-secret-key

Body:
{
  "sessionId": "main-session",
  "credentials": {
    "creds": {...},
    "keys": {...}
  }
}
```

#### Get WhatsApp Credentials
```http
GET /api/whatsapp/credentials/:sessionId
X-API-Key: your-api-secret-key
```

#### Update WhatsApp Credentials
```http
PUT /api/whatsapp/credentials/:sessionId
Content-Type: application/json
X-API-Key: your-api-secret-key

Body:
{
  "credentials": {
    "creds": {...},
    "keys": {...}
  }
}
```

#### Delete WhatsApp Credentials
```http
DELETE /api/whatsapp/credentials/:sessionId
X-API-Key: your-api-secret-key
```

#### List All Sessions
```http
GET /api/whatsapp/sessions
X-API-Key: your-api-secret-key
```

## cPanel Deployment

### Method 1: File Manager Upload

1. **Prepare files**
   - Zip the entire project folder
   - Upload via cPanel File Manager
   - Extract in your domain folder (e.g., `public_html/api`)

2. **Install dependencies**
   ```bash
   # SSH into your cPanel or use Terminal in File Manager
   cd public_html/api
   npm install --production
   ```

3. **Configure environment**
   ```bash
   # Create .env file
   cp .env.example .env
   nano .env
   ```

4. **Setup Node.js App**
   - Go to cPanel → Node.js Apps
   - Create new application
   - Set startup file: `server.js`
   - Set application URL: `/api`

### Method 2: Git Deployment (if supported)

1. **Clone repository**
   ```bash
   cd public_html
   git clone <your-repo-url> api
   cd api
   ```

2. **Install and configure**
   ```bash
   npm install --production
   cp .env.example .env
   nano .env
   ```

3. **Setup Node.js App in cPanel**

## File Structure

```
whatsapp-storage-api/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment configuration template
├── .env                  # Your environment configuration (create this)
├── README.md             # This documentation
├── test.js               # Test script
├── uploads/              # Uploaded files directory (auto-created)
├── credentials/          # WhatsApp credentials storage (auto-created)
└── logs/                 # Application logs (auto-created)
```

## Security Features

- **API Key Authentication**: Protects all endpoints
- **Rate Limiting**: Prevents abuse with configurable limits
- **File Type Validation**: Only allows safe file types
- **File Size Limits**: Configurable maximum file size
- **CORS Protection**: Configurable origin restrictions
- **Helmet Security**: Additional security headers
- **Input Validation**: Validates all inputs and parameters

## Supported File Types

- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, DOC, DOCX, TXT
- Data: JSON

## Error Handling

The API provides detailed error responses:

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid API key)
- `404`: Not Found
- `413`: Payload Too Large (file too big)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Testing

### Automated Testing
Gunakan script testing yang disediakan:

```bash
# Install axios untuk testing
npm install axios

# Edit konfigurasi di test.js jika perlu
# Ubah API_BASE dan API_KEY sesuai dengan setup Anda

# Jalankan semua test
node test.js
```

Script test akan menguji semua endpoint dan memberikan laporan hasil:
- Health check endpoint
- Authentication validation
- WhatsApp credentials CRUD operations
- File upload functionality
- Error handling

### Manual Testing
Run the test script to verify installation:

```bash
npm test
```

### cURL Examples
```bash
# Health check
curl http://localhost:3001/health

# Save credentials (requires API key)
curl -X POST http://localhost:3001/api/whatsapp/credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-super-secret-api-key-here" \
  -d '{"sessionId": "test123", "credentials": {"creds": {...}, "keys": {...}}}'

# Get credentials
curl http://localhost:3001/api/whatsapp/credentials/test123 \
  -H "X-API-Key: your-super-secret-api-key-here"
```

## Usage Examples

### JavaScript/Node.js Client
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'https://yourdomain.com/api';
const API_KEY = 'your-api-secret-key';

// Upload file
const uploadFile = async (filePath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post(`${API_BASE}/api/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': API_KEY
    }
  });
  
  return response.data;
};

// Save WhatsApp credentials
const saveCredentials = async (sessionId, credentials) => {
  const response = await axios.post(`${API_BASE}/api/whatsapp/credentials`, {
    sessionId,
    credentials
  }, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
};
```

### cURL Examples
```bash
# Health check
curl -X GET "https://yourdomain.com/api/health"

# Upload file
curl -X POST "https://yourdomain.com/api/api/upload" \
  -H "X-API-Key: your-api-secret-key" \
  -F "file=@document.pdf"

# Save credentials
curl -X POST "https://yourdomain.com/api/api/whatsapp/credentials" \
  -H "X-API-Key: your-api-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"main","credentials":{"creds":{},"keys":{}}}'
```

## Monitoring

### Log Files
- Application logs: `./logs/api.log`
- Access logs: Check cPanel logs

### Health Monitoring
Use the `/health` endpoint for monitoring:
```bash
curl -X GET "https://yourdomain.com/api/health"
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Fix directory permissions
   chmod 755 uploads credentials logs
   ```

2. **Port Already in Use**
   - Change PORT in .env file
   - Or kill existing process

3. **File Upload Fails**
   - Check MAX_FILE_SIZE setting
   - Verify file type is allowed
   - Check disk space

4. **API Key Issues**
   - Verify API_SECRET in .env
   - Check header format in requests

### Support

For issues or questions, check:
1. Application logs in `./logs/`
2. cPanel error logs
3. Node.js application logs in cPanel

## License

MIT License - see LICENSE file for details.
