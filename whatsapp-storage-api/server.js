const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
// Use PORT from environment (cPanel assigns this) or fallback to 3001 for local
const PORT = process.env.PORT || process.env.CPANEL_PORT || 3001;

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
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_REQUESTS || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Key authentication middleware
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // Hard-coded fallback for cPanel environment cache issues
  const EXPECTED_API_SECRET = process.env.API_SECRET || 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=';
  
  console.log('🔍 Auth Debug:', {
    received_key: apiKey ? apiKey.substring(0, 10) + '...' : 'NONE',
    env_secret: process.env.API_SECRET ? 'SET' : 'NOT_SET',
    using_fallback: !process.env.API_SECRET ? 'YES' : 'NO',
    match: apiKey === EXPECTED_API_SECRET
  });
  
  if (!apiKey || apiKey !== EXPECTED_API_SECRET) {
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
    fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // More flexible mimetype checking for text files
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
    version: '1.0.0'
  });
});

// Debug endpoint for environment variables
app.get('/debug-env', (req, res) => {
  res.json({
    success: true,
    environment: {
      API_SECRET: process.env.API_SECRET ? 'SET' : 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 'NOT_SET',
      fallback_active: !process.env.API_SECRET
    },
    timestamp: new Date().toISOString()
  });
});

// Test authentication endpoint
app.get('/test-auth', authenticateAPI, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful with updated middleware!',
    timestamp: new Date().toISOString()
  });
});

// File upload endpoint
app.post('/api/upload', authenticateAPI, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      path: req.file.path
    };

    // Log upload
    console.log('📤 File uploaded:', fileInfo);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed'
    });
  }
});

// Multiple files upload
app.post('/api/upload-multiple', authenticateAPI, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      uploadDate: new Date().toISOString(),
      path: file.path
    }));

    console.log('📤 Multiple files uploaded:', filesInfo.length);

    res.json({
      success: true,
      message: `${filesInfo.length} files uploaded successfully`,
      files: filesInfo
    });

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Multiple files upload failed'
    });
  }
});

// WhatsApp credentials storage endpoints

// Save WhatsApp credentials
app.post('/api/whatsapp/credentials', authenticateAPI, async (req, res) => {
  try {
    const { sessionId, credentials } = req.body;

    if (!sessionId || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'SessionId and credentials are required'
      });
    }

    const credentialsData = {
      sessionId,
      credentials,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    const filename = `whatsapp-${sessionId}.json`;
    const filepath = path.join('./credentials', filename);

    await fs.writeFile(filepath, JSON.stringify(credentialsData, null, 2));

    console.log('💾 WhatsApp credentials saved:', sessionId);

    res.json({
      success: true,
      message: 'WhatsApp credentials saved successfully',
      sessionId,
      filename
    });

  } catch (error) {
    console.error('❌ Credentials save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save WhatsApp credentials'
    });
  }
});

// Get WhatsApp credentials
app.get('/api/whatsapp/credentials/:sessionId', authenticateAPI, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const filename = `whatsapp-${sessionId}.json`;
    const filepath = path.join('./credentials', filename);

    try {
      const data = await fs.readFile(filepath, 'utf8');
      const credentialsData = JSON.parse(data);

      console.log('📖 WhatsApp credentials retrieved:', sessionId);

      res.json({
        success: true,
        message: 'WhatsApp credentials retrieved successfully',
        data: credentialsData
      });

    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: 'WhatsApp credentials not found'
        });
      }
      throw fileError;
    }

  } catch (error) {
    console.error('❌ Credentials retrieve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WhatsApp credentials'
    });
  }
});

// Update WhatsApp credentials
app.put('/api/whatsapp/credentials/:sessionId', authenticateAPI, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { credentials } = req.body;

    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'Credentials are required'
      });
    }

    const filename = `whatsapp-${sessionId}.json`;
    const filepath = path.join('./credentials', filename);

    // Read existing data
    let existingData = {};
    try {
      const data = await fs.readFile(filepath, 'utf8');
      existingData = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, will create new
    }

    const credentialsData = {
      ...existingData,
      sessionId,
      credentials,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.writeFile(filepath, JSON.stringify(credentialsData, null, 2));

    console.log('🔄 WhatsApp credentials updated:', sessionId);

    res.json({
      success: true,
      message: 'WhatsApp credentials updated successfully',
      sessionId,
      filename
    });

  } catch (error) {
    console.error('❌ Credentials update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update WhatsApp credentials'
    });
  }
});

// Delete WhatsApp credentials
app.delete('/api/whatsapp/credentials/:sessionId', authenticateAPI, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const filename = `whatsapp-${sessionId}.json`;
    const filepath = path.join('./credentials', filename);

    try {
      await fs.unlink(filepath);

      console.log('🗑️ WhatsApp credentials deleted:', sessionId);

      res.json({
        success: true,
        message: 'WhatsApp credentials deleted successfully',
        sessionId
      });

    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: 'WhatsApp credentials not found'
        });
      }
      throw fileError;
    }

  } catch (error) {
    console.error('❌ Credentials delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete WhatsApp credentials'
    });
  }
});

// List all WhatsApp sessions
app.get('/api/whatsapp/sessions', authenticateAPI, async (req, res) => {
  try {
    const files = await fs.readdir('./credentials');
    const sessions = [];

    for (const file of files) {
      if (file.startsWith('whatsapp-') && file.endsWith('.json')) {
        try {
          const filepath = path.join('./credentials', file);
          const data = await fs.readFile(filepath, 'utf8');
          const credentialsData = JSON.parse(data);
          
          sessions.push({
            sessionId: credentialsData.sessionId,
            lastUpdated: credentialsData.lastUpdated,
            filename: file
          });
        } catch (error) {
          console.warn('⚠️ Error reading file:', file, error.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'WhatsApp sessions listed successfully',
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('❌ Sessions list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list WhatsApp sessions'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  await createDirectories();
  
  app.listen(PORT, () => {
    console.log('🚀 WhatsApp Storage API Server Started');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ API endpoints:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   POST /api/upload - Single file upload`);
    console.log(`   POST /api/upload-multiple - Multiple files upload`);
    console.log(`   POST /api/whatsapp/credentials - Save WhatsApp credentials`);
    console.log(`   GET  /api/whatsapp/credentials/:sessionId - Get credentials`);
    console.log(`   PUT  /api/whatsapp/credentials/:sessionId - Update credentials`);
    console.log(`   DELETE /api/whatsapp/credentials/:sessionId - Delete credentials`);
    console.log(`   GET  /api/whatsapp/sessions - List all sessions`);
    console.log('✅ Ready to handle requests');
  });
};

startServer().catch(console.error);

module.exports = app;
