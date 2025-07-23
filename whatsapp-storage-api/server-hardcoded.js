// Hard-coded API validation for cPanel deployment
// This bypasses environment variable caching issues

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Hard-coded configuration to bypass env cache
const CONFIG = {
  PORT: process.env.PORT || 3001,
  API_SECRET: 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=', // Hard-coded
  MAX_FILE_SIZE: 10485760,
  CORS_ORIGIN: '*',
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 15,
  NODE_ENV: 'production'
};

console.log('🔧 Server Configuration:');
console.log('- API_SECRET:', CONFIG.API_SECRET);
console.log('- PORT:', CONFIG.PORT);
console.log('- Environment variables:', {
  API_SECRET: process.env.API_SECRET || 'NOT_SET',
  PORT: process.env.PORT || 'NOT_SET',
  NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
});

const app = express();

// Create necessary directories
const createDirectories = async () => {
  try {
    await fs.mkdir('./uploads', { recursive: true });
    await fs.mkdir('./credentials', { recursive: true });
    await fs.mkdir('./logs', { recursive: true });
    console.log('✅ Directories created successfully');
  } catch (error) {
    console.error('❌ Error creating directories:', error);
  }
};

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: CONFIG.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW * 60 * 1000,
  max: CONFIG.RATE_LIMIT_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Key authentication middleware with hard-coded key
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  console.log('🔍 Auth check:', {
    received: apiKey,
    expected: CONFIG.API_SECRET,
    match: apiKey === CONFIG.API_SECRET
  });
  
  if (!apiKey || apiKey !== CONFIG.API_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key'
    });
  }
  
  next();
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/txt',
      'application/json', 'text/json'
    ];
    
    const mimetypeAllowed = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('text/');
    
    if (mimetypeAllowed && extname) {
      console.log('✅ File type allowed:', file.originalname, file.mimetype);
      return cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.originalname, file.mimetype);
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, pdf, doc, docx, txt, json`));
    }
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Storage API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    config: {
      api_secret_set: !!CONFIG.API_SECRET,
      env_api_secret: !!process.env.API_SECRET,
      port: CONFIG.PORT
    }
  });
});

// Environment debug endpoint
app.get('/debug-env', (req, res) => {
  res.json({
    success: true,
    environment: {
      API_SECRET: process.env.API_SECRET ? 'SET' : 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      hardcoded_secret: CONFIG.API_SECRET ? 'SET' : 'NOT_SET'
    },
    timestamp: new Date().toISOString()
  });
});

// Test authentication endpoint
app.get('/test-auth', authenticateAPI, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful!',
    timestamp: new Date().toISOString()
  });
});

// Include all other endpoints from original server.js here...
// (I'll add them in the next part to keep this file manageable)

module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  const startServer = async () => {
    await createDirectories();
    
    app.listen(CONFIG.PORT, () => {
      console.log('🚀 WhatsApp Storage API Server Started (Hard-coded Config)');
      console.log(`📍 Port: ${CONFIG.PORT}`);
      console.log(`🔑 API Secret: ${CONFIG.API_SECRET.substring(0, 10)}...`);
      console.log('✅ Ready to handle requests');
    });
  };
  
  startServer().catch(console.error);
}
