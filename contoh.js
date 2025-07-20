const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const AIService = require('./ai-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Backend API configuration
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3005';

app.use(express.json());

// Initialize AI Service
const aiService = new AIService();

// Store active WhatsApp sessions per bot
const activeSessions = new Map();

// Function to fetch bot training data from backend API
async function fetchBotTrainingData(botId) {
  try {
    console.log(`📚 Fetching training data for bot ${botId}...`);
    
    const response = await axios.get(`${BACKEND_API_URL}/api/bots/${botId}/training-data-public`);
    
    if (response.data.success && response.data.data) {
      const trainingData = response.data.data;
      console.log(`✅ Retrieved ${trainingData.length} training data items for bot ${botId}`);
      
      // Format training data for AI service
      const formattedData = trainingData.map(item => {
        // Use processed_content if available, otherwise use response
        const content = item.processed_content || item.response || '';
        return content.trim();
      }).filter(content => content.length > 0);
      
      console.log(`📋 Formatted ${formattedData.length} valid training items`);
      return formattedData;
    } else {
      console.log(`⚠️  No training data found for bot ${botId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching training data for bot ${botId}:`, error.message);
    return [];
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'WhatsApp Webhook',
    activeSessions: activeSessions.size,
    timestamp: new Date().toISOString()
  });
});

// Get active sessions
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(activeSessions.keys()).map(botId => ({
    botId,
    connected: activeSessions.get(botId)?.user ? true : false,
    phone: activeSessions.get(botId)?.user?.id || null
  }));
  
  res.json({
    success: true,
    totalSessions: activeSessions.size,
    sessions
  });
});

// Create sessions directory if it doesn't exist
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// WhatsApp webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// Handle incoming WhatsApp messages
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(async (entry) => {
        entry.changes?.forEach(async (change) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            
            if (messages) {
              for (const message of messages) {
                await processMessage(message);
              }
            }
          }
        });
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

async function processMessage(message) {
  try {
    console.log('Processing message:', message);
    
    // Send to main API for processing
    await axios.post(`${process.env.API_BASE_URL}/api/process-message`, {
      from: message.from,
      text: message.text?.body,
      type: message.type,
      timestamp: message.timestamp
    });

    // Note: This function is for WhatsApp Business API webhook
    // For Baileys messages, use processBaileysMessage instead
    // Here we use simple generateReply as fallback for webhook messages
    const reply = generateReply(message.text?.body || '');
    await sendWhatsAppMessage(message.from, reply);
    
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

function generateReply(messageText) {
  // Simple keyword-based responses
  const text = messageText.toLowerCase();
  
  if (text.includes('hello') || text.includes('hi')) {
    return 'Hello! How can I help you today?';
  } else if (text.includes('help')) {
    return 'I\'m here to help! What do you need assistance with?';
  } else if (text.includes('bye')) {
    return 'Goodbye! Have a great day!';
  } else {
    return 'Thank you for your message. Our team will get back to you soon!';
  }
}

async function sendWhatsAppMessage(to, message) {
  try {
    // WhatsApp Business API call
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
  }
}

// Helper function to get auth path for each bot
function getAuthPath(botId) {
  return path.join(sessionsDir, `bot_${botId}`);
}

// Setup event listeners for a WhatsApp socket connection
function setupSocketEventListeners(sock, botId, saveCreds) {
  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    console.log(`🔄 Bot ${botId} connection update:`, {
      connection,
      lastDisconnect: lastDisconnect?.error?.output?.statusCode,
      hasQR: !!qr,
      errorMessage: lastDisconnect?.error?.message
    });

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || '';
      
      console.log(`❌ Bot ${botId} connection closed:`, {
        statusCode,
        errorMessage,
        reason: lastDisconnect?.error?.output?.payload?.error
      });
      
      // Handle different disconnect reasons
      let shouldReconnect = false;
      let clearSession = false;
      
      switch (statusCode) {
        case DisconnectReason.badSession:
          console.log(`🔒 Bot ${botId}: Bad session, clearing credentials`);
          clearSession = true;
          shouldReconnect = false;
          break;
          
        case DisconnectReason.connectionClosed:
          console.log(`🔌 Bot ${botId}: Connection closed, will try to reconnect`);
          shouldReconnect = true;
          break;
          
        case DisconnectReason.connectionLost:
          console.log(`📡 Bot ${botId}: Connection lost, will try to reconnect`);
          shouldReconnect = true;
          break;
          
        case DisconnectReason.connectionReplaced:
          console.log(`🔄 Bot ${botId}: Connection replaced, stopping this instance`);
          shouldReconnect = false;
          break;
          
        case DisconnectReason.loggedOut:
          console.log(`👋 Bot ${botId}: Logged out, clearing session`);
          clearSession = true;
          shouldReconnect = false;
          break;
          
        case DisconnectReason.restartRequired:
          console.log(`🔄 Bot ${botId}: Restart required, will reconnect`);
          shouldReconnect = true;
          break;
          
        case DisconnectReason.timedOut:
          console.log(`⏰ Bot ${botId}: Connection timed out, will retry`);
          shouldReconnect = true;
          break;
          
        default:
          // Check for 401 errors specifically
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            console.log(`🚫 Bot ${botId}: 401 Unauthorized error, clearing session`);
            clearSession = true;
            shouldReconnect = false;
          } else {
            console.log(`❓ Bot ${botId}: Unknown disconnect reason, will try to reconnect`);
            shouldReconnect = true;
          }
          break;
      }
      
      // Clear session if needed
      if (clearSession) {
        console.log(`🗑️ Bot ${botId}: Clearing session files...`);
        activeSessions.delete(botId);
        
        // Remove session files
        const authPath = getAuthPath(botId);
        if (fs.existsSync(authPath)) {
          try {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log(`✅ Bot ${botId}: Session files cleared`);
          } catch (error) {
            console.error(`❌ Bot ${botId}: Failed to clear session files:`, error);
          }
        }
        
        // Notify backend API about disconnection
        try {
          await axios.post(`${process.env.API_BASE_URL}/api/webhook/bots/${botId}/status`, {
            status: 'disconnected',
            reason: 'session_cleared',
            requiresNewQR: true
          });
        } catch (error) {
          console.error('Failed to notify backend about disconnection:', error.message);
        }
      } else if (!shouldReconnect) {
        activeSessions.delete(botId);
        
        // Notify backend API about disconnection
        try {
          await axios.post(`${process.env.API_BASE_URL}/api/webhook/bots/${botId}/status`, {
            status: 'disconnected',
            reason: 'logged_out'
          });
        } catch (error) {
          console.error('Failed to notify backend about disconnection:', error.message);
        }
      }
      
      // Auto-reconnect if appropriate
      if (shouldReconnect) {
        console.log(`🔄 Bot ${botId}: Attempting to reconnect in 5 seconds...`);
        setTimeout(async () => {
          try {
            await createWhatsAppConnection(botId);
            console.log(`✅ Bot ${botId}: Reconnection attempt started`);
          } catch (error) {
            console.error(`❌ Bot ${botId}: Reconnection failed:`, error);
          }
        }, 5000);
      }
      
    } else if (connection === 'open') {
      console.log(`✅ Bot ${botId} connected successfully!`);
      
      // Notify backend API about successful connection
      try {
        await axios.post(`${process.env.API_BASE_URL}/api/webhook/bots/${botId}/status`, {
          status: 'connected',
          user: sock.user
        });
      } catch (error) {
        console.error('Failed to notify backend about connection:', error.message);
      }
    }
  });

  // Credentials updates
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages for this specific bot
  sock.ev.on('messages.upsert', async (m) => {
    const messages = m.messages;
    const logMessage = `📨 ${new Date().toISOString()} - Received ${messages.length} message(s) for bot ${botId}`;
    console.log(logMessage);
    
    // Also write to file for debugging
    const fs = require('fs');
    fs.appendFileSync('/Users/yogaesamahendra/Project/BotLinko/webhook-debug.log', logMessage + '\n');
    
    for (const message of messages) {
      console.log(`🔍 Message details:`, {
        fromMe: message.key.fromMe,
        hasMessage: !!message.message,
        remoteJid: message.key.remoteJid,
        messageType: Object.keys(message.message || {})[0]
      });
      
      if (!message.key.fromMe && message.message) {
        console.log(`✅ Processing incoming message for bot ${botId}`);
        await processBaileysMessage(botId, message, sock);
      } else {
        console.log(`⏭️ Skipping message for bot ${botId} (fromMe: ${message.key.fromMe}, hasMessage: ${!!message.message})`);
      }
    }
  });
}

// Create WhatsApp connection for a specific bot
async function createWhatsAppConnection(botId) {
  try {
    const authPath = getAuthPath(botId);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
    });

    // Store the socket connection
    activeSessions.set(botId, sock);

    // Setup all event listeners
    setupSocketEventListeners(sock, botId, saveCreds);

    return { sock, saveCreds };
  } catch (error) {
    console.error(`Error creating WhatsApp connection for bot ${botId}:`, error);
    throw error;
  }
}

// Endpoint to generate QR code for bot setup
app.post('/api/bot/:botId/setup', async (req, res) => {
  const { botId } = req.params;
  
  try {
    console.log(`Setting up WhatsApp bot ${botId}`);

    // Check if bot is already connected
    if (activeSessions.has(botId)) {
      const sock = activeSessions.get(botId);
      if (sock.user) {
        return res.json({ 
          success: true, 
          message: 'Bot is already connected',
          connected: true,
          user: sock.user
        });
      }
    }

    const { sock, saveCreds } = await createWhatsAppConnection(botId);
    let qrGenerated = false;

    // Add QR generation handler
    const qrHandler = async (update) => {
      const { qr } = update;
      
      if (qr && !qrGenerated) {
        try {
          // Generate QR code as base64 image
          const qrImage = await QRCode.toDataURL(qr);
          qrGenerated = true;
          
          // Send QR code to client
          res.json({
            success: true,
            qr: qrImage,
            message: 'Scan QR code with WhatsApp to connect'
          });

          console.log(`QR code generated for bot ${botId}`);
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
          res.status(500).json({ error: 'Failed to generate QR code' });
        }
      }
    };

    // Temporarily add QR handler
    sock.ev.on('connection.update', qrHandler);

    // Timeout if QR not scanned within 2 minutes
    setTimeout(() => {
      if (!sock.user && !qrGenerated) {
        sock.end();
        activeSessions.delete(botId);
        if (!res.headersSent) {
          res.status(408).json({ error: 'QR code generation timeout' });
        }
      }
    }, 120000);

  } catch (error) {
    console.error(`Error setting up bot ${botId}:`, error);
    res.status(500).json({ error: 'Failed to setup WhatsApp bot' });
  }
});

// Endpoint to check bot connection status
app.get('/api/bot/:botId/status', (req, res) => {
  const { botId } = req.params;
  
  if (activeSessions.has(botId)) {
    const sock = activeSessions.get(botId);
    res.json({
      connected: !!sock.user,
      user: sock.user || null,
      botId
    });
  } else {
    res.json({
      connected: false,
      user: null,
      botId
    });
  }
});

// Endpoint to disconnect bot
app.post('/api/bot/:botId/disconnect', async (req, res) => {
  const { botId } = req.params;
  
  try {
    if (activeSessions.has(botId)) {
      const sock = activeSessions.get(botId);
      await sock.logout();
      activeSessions.delete(botId);
      
      // Remove session files
      const authPath = getAuthPath(botId);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
    }
    
    res.json({ success: true, message: 'Bot disconnected successfully' });
  } catch (error) {
    console.error(`Error disconnecting bot ${botId}:`, error);
    res.status(500).json({ error: 'Failed to disconnect bot' });
  }
});

// Endpoint to clear bot session and prepare for new QR
app.post('/api/bot/:botId/clear-session', async (req, res) => {
  const { botId } = req.params;
  
  try {
    console.log(`🗑️ Clearing session for bot ${botId}...`);
    
    // Close existing connection if any
    if (activeSessions.has(botId)) {
      const sock = activeSessions.get(botId);
      try {
        sock.end();
      } catch (error) {
        console.log(`Warning: Error closing socket for bot ${botId}:`, error.message);
      }
      activeSessions.delete(botId);
    }
    
    // Remove session files
    const authPath = getAuthPath(botId);
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log(`✅ Session files cleared for bot ${botId}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Session cleared successfully. Bot is ready for new QR code generation.'
    });
  } catch (error) {
    console.error(`Error clearing session for bot ${botId}:`, error);
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

// Endpoint to send message via specific bot
app.post('/api/bot/:botId/send', async (req, res) => {
  const { botId } = req.params;
  const { to, message } = req.body;
  
  try {
    if (!activeSessions.has(botId)) {
      return res.status(400).json({ error: 'Bot not connected' });
    }
    
    const sock = activeSessions.get(botId);
    if (!sock.user) {
      return res.status(400).json({ error: 'Bot not authenticated' });
    }
    
    // Format phone number (add country code if needed)
    const formattedNumber = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    
    await sock.sendMessage(formattedNumber, { text: message });
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error(`Error sending message via bot ${botId}:`, error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Helper function to generate services list
async function generateServicesList(botId) {
  try {
    // Fetch services from backend API
    const servicesResponse = await axios.get(`${process.env.API_BASE_URL}/api/bots/${botId}/services-public`);
    
    if (servicesResponse.data.success && servicesResponse.data.data && servicesResponse.data.data.length > 0) {
      const services = servicesResponse.data.data;
      
      let servicesList = "🛍️ *Daftar Layanan Kami*\n\n";
      
      services.forEach((service, index) => {
        servicesList += `${index + 1}. *${service.name}*\n`;
        if (service.description) {
          servicesList += `   📝 ${service.description}\n`;
        }
        servicesList += `   ⏱️ Durasi: ${service.duration} menit\n`;
        if (service.price) {
          servicesList += `   💰 Harga: Rp ${service.price.toLocaleString('id-ID')}\n`;
        }
        servicesList += "\n";
      });
      
      servicesList += "📞 *Untuk booking, hubungi admin kami atau ketik 'booking' untuk panduan lebih lanjut.*\n";
      servicesList += "💬 Ketik 'menu' untuk kembali ke menu utama.";
      
      return servicesList;
    } else {
      return "📋 Maaf, saat ini belum ada layanan yang tersedia.\n\n" +
             "Silakan hubungi admin kami untuk informasi lebih lanjut! 😊";
    }
  } catch (error) {
    console.error(`Error fetching services for bot ${botId}:`, error.message);
    return "❌ Maaf, terjadi kesalahan saat mengambil daftar layanan.\n\n" +
           "Silakan coba lagi atau hubungi admin kami! 🙏";
  }
}

// Helper function to check if message is a system command
function isSystemCommand(messageText, botConfig) {
  const lowerMessage = messageText.toLowerCase().trim();
  
  // System commands have highest priority
  const systemCommands = ['menu', 'help', 'bantuan', 'start', 'mulai'];
  
  // Custom service commands
  if (botConfig?.services_command_keywords) {
    const serviceKeywords = botConfig.services_command_keywords.split(',').map(k => k.trim().toLowerCase());
    systemCommands.push(...serviceKeywords);
  } else {
    // Fallback service commands
    systemCommands.push('layanan', 'services', 'daftar layanan', 'list services', 'service', 'jasa');
  }
  
  // Custom booking commands  
  if (botConfig?.booking_command_keywords) {
    const bookingKeywords = botConfig.booking_command_keywords.split(',').map(k => k.trim().toLowerCase());
    systemCommands.push(...bookingKeywords);
  } else {
    // Fallback booking commands
    systemCommands.push('booking', 'buat janji', 'appointment', 'jadwal');
  }
  
  return systemCommands.some(cmd => lowerMessage.includes(cmd));
}

// Helper function to check if message should be routed to AI
function shouldRouteToAI(messageText, botConfig) {
  if (!botConfig?.ai_enabled) return false;
  
  const lowerMessage = messageText.toLowerCase().trim();
  
  // Conversational patterns that should go to AI
  const conversationalPatterns = [
    // Questions
    /\b(apa|apakah|bagaimana|kenapa|mengapa|dimana|kapan|siapa)\b/,
    /\b(what|how|why|where|when|who|can|could|would|should)\b/,
    
    // Requests for information
    /\b(info|informasi|tahu|tau|explain|jelaskan|cerita)\b/,
    
    // Complex sentences (more than 3 words and contains question words or conversational indicators)
    /\b(saya|aku|kamu|anda|bisa|dapat|mau|ingin|perlu)\b/,
    
    // Greeting with questions
    /\b(halo|hai|hello|hi).+(bagaimana|apa|bisa)\b/,
  ];
  
  // Check if message length suggests a conversational query (more than simple commands)
  const isComplexMessage = messageText.split(' ').length > 2;
  
  // Check for conversational patterns
  const hasConversationalPattern = conversationalPatterns.some(pattern => pattern.test(lowerMessage));
  
  return isComplexMessage && hasConversationalPattern;
}

// Helper function to check auto-reply rules
async function checkAutoReplyRules(botId, messageText) {
  try {
    console.log(`🤖 Checking regular auto-reply rules...`);
    const response = await axios.get(`${process.env.API_BASE_URL}/api/bots/${botId}/auto-reply-rules-public`);
    
    if (!response.data.success || !response.data.data) {
      console.log(`No auto-reply rules found for bot ${botId}`);
      return null;
    }
    
    const rules = response.data.data;
    console.log(`Found ${rules.length} auto-reply rules for bot ${botId}`);
    
    // Sort by priority (ascending - lower number = higher priority)
    const sortedRules = rules
      .filter(rule => rule.is_active)
      .sort((a, b) => a.priority - b.priority);
    
    // Check each rule for match
    for (const rule of sortedRules) {
      const keywords = rule.keywords.split(',').map(k => k.trim());
      const messageForCheck = rule.case_sensitive ? messageText : messageText.toLowerCase();
      
      for (const keyword of keywords) {
        const keywordForCheck = rule.case_sensitive ? keyword : keyword.toLowerCase();
        
        let isMatch = false;
        
        switch (rule.match_type) {
          case 'exact':
            isMatch = messageForCheck === keywordForCheck;
            break;
          case 'starts_with':
            isMatch = messageForCheck.startsWith(keywordForCheck);
            break;
          case 'ends_with':
            isMatch = messageForCheck.endsWith(keywordForCheck);
            break;
          case 'contains':
          default:
            isMatch = messageForCheck.includes(keywordForCheck);
            break;
        }
        
        if (isMatch) {
          console.log(`Auto-reply match found for bot ${botId}: keyword "${keyword}" (${rule.match_type}) -> "${rule.response}"`);
          return rule.response;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking auto-reply rules for bot ${botId}:`, error.message);
    return null;
  }
}

// Intelligent routing function with priority-based flow
async function findAutoReplyMatch(botId, messageText) {
  try {
    console.log(`🔍 Starting intelligent routing for bot ${botId} with message: "${messageText}"`);
    
    // Fetch bot configuration first
    let botConfig = null;
    try {
      const botResponse = await axios.get(`${process.env.API_BASE_URL}/api/bots/${botId}/public`);
      if (botResponse.data.success) {
        botConfig = botResponse.data.data;
        console.log(`📋 Bot config loaded for ${botId}, AI enabled: ${botConfig?.ai_enabled}`);
      }
    } catch (error) {
      console.error(`Error fetching bot config for ${botId}:`, error.message);
    }

    // ============ PRIORITY LEVEL 1: SYSTEM COMMANDS ============
    // System commands always take highest priority
    if (isSystemCommand(messageText, botConfig)) {
      console.log(`🔧 System command detected, routing to auto-reply rules`);
      const systemResponse = await checkAutoReplyRules(botId, messageText);
      if (systemResponse) {
        return systemResponse;
      }
      
      // If no auto-reply rule matched, handle built-in system commands
      const lowerMessage = messageText.toLowerCase().trim();
      
      // Handle menu/help commands
      if (lowerMessage.includes('menu') || lowerMessage.includes('help') || lowerMessage.includes('bantuan')) {
        console.log(`📋 Menu command detected`);
        return "📋 *Menu Utama*\n\n" +
               "Ketik salah satu perintah berikut:\n" +
               "• *layanan* - Lihat daftar layanan\n" +
               "• *booking* - Buat janji temu\n" +
               "• *bantuan* - Panduan penggunaan\n\n" +
               "Atau langsung tulis pertanyaan Anda! 😊";
      }
      
      // Handle services commands
      if (lowerMessage.includes('layanan') || lowerMessage.includes('services') || 
          lowerMessage.includes('service') || lowerMessage.includes('jasa')) {
        console.log(`🛍️ Services command detected`);
        return await generateServicesList(botId);
      }
      
      // Handle booking commands
      if (lowerMessage.includes('booking') || lowerMessage.includes('buat janji') || 
          lowerMessage.includes('appointment') || lowerMessage.includes('jadwal')) {
        console.log(`📅 Booking command detected`);
        return "📅 *Booking Appointment*\n\n" +
               "Untuk membuat janji temu, silakan ikuti langkah berikut:\n" +
               "1. Ketik *'layanan'* untuk melihat daftar layanan\n" +
               "2. Pilih layanan yang diinginkan\n" +
               "3. Tentukan tanggal dan waktu\n" +
               "4. Konfirmasi data Anda\n\n" +
               "Atau hubungi admin kami untuk bantuan lebih lanjut! 😊";
      }
    }

    // ============ PRIORITY LEVEL 2: CONVERSATIONAL AI ============
    // Route conversational queries to AI if enabled and suitable
    if (shouldRouteToAI(messageText, botConfig)) {
      console.log(`🤖 Conversational query detected, routing to AI`);
      
      try {
        // Fetch training data for this bot
        const trainingData = await fetchBotTrainingData(botId);
        
        if (trainingData && trainingData.length > 0) {
          console.log(`📚 Found ${trainingData.length} training data items for AI`);
          
          // Use the enhanced AI service with correct signature:
          // generateResponse(message, trainingData, userId, botConfig)
          const userId = `${botId}_conversational_ai`;
          const aiResponse = await aiService.generateResponse(messageText, trainingData, userId, botConfig);
          
          if (aiResponse && aiResponse.trim() !== '') {
            console.log(`✅ AI response generated successfully`);
            return aiResponse;
          } else {
            console.log(`❌ AI response was empty, falling back to auto-reply rules`);
          }
        } else {
          console.log(`📚 No training data found for AI, falling back to auto-reply rules`);
        }
      } catch (error) {
        console.error(`❌ Error generating AI response:`, error.message);
        console.log(`🔄 Falling back to auto-reply rules`);
      }
    }

    // ============ PRIORITY LEVEL 3: AUTO-REPLY RULES ============
    // Check standard auto-reply rules
    console.log(`📋 Checking standard auto-reply rules`);
    const autoReplyResponse = await checkAutoReplyRules(botId, messageText);
    if (autoReplyResponse) {
      return autoReplyResponse;
    }

    // ============ PRIORITY LEVEL 4: AI FALLBACK ============
    // If AI is enabled but message wasn't routed to AI initially, try as fallback
    if (botConfig?.ai_enabled && !shouldRouteToAI(messageText, botConfig)) {
      console.log(`🔄 No auto-reply match found, trying AI as fallback`);
      
      try {
        const trainingData = await fetchBotTrainingData(botId);
        
        if (trainingData && trainingData.length > 0) {
          // Use the enhanced AI service with correct signature:
          // generateResponse(message, trainingData, userId, botConfig)
          const userId = `${botId}_fallback_ai`;
          const aiResponse = await aiService.generateResponse(messageText, trainingData, userId, botConfig);
          
          if (aiResponse && aiResponse.trim() !== '') {
            console.log(`✅ AI fallback response generated`);
            return aiResponse;
          }
        }
      } catch (error) {
        console.error(`❌ Error in AI fallback:`, error.message);
      }
    }

    // ============ PRIORITY LEVEL 5: DEFAULT REPLY ============
    // Final fallback to default reply if enabled
    console.log(`🔄 Checking default reply as final fallback`);
    
    if (botConfig?.default_reply_enabled === true) {
      console.log(`Default reply is enabled for bot ${botId}`);
      
      if (botConfig.default_reply_message && botConfig.default_reply_message.trim() !== '') {
        console.log(`Using configured default reply message`);
        return botConfig.default_reply_message.replace(/&#10;/g, '\n');
      } else {
        console.log(`Using generated default reply`);
        return "Maaf, saya tidak mengerti pertanyaan Anda. 🤔\n\n" +
               "Silakan ketik *'menu'* untuk melihat opsi yang tersedia atau " +
               "hubungi admin kami untuk bantuan lebih lanjut! 😊";
      }
    } else {
      console.log(`Default reply is disabled for bot ${botId}, no response sent`);
      return null;
    }
  } catch (error) {
    console.error(`Error finding auto-reply match for bot ${botId}:`, error.message);
    return null;
  }
}

// ============ APPOINTMENT BOOKING VIA WHATSAPP ============

// Helper function to parse appointment from WhatsApp message
function parseAppointmentMessage(messageText) {
  try {
    // Format: BOOKING [SERVICE] [DATE] [TIME] [NAME] [PHONE]
    // Example: "BOOKING Potong Rambut 2025-06-28 14:30 John Doe 081234567890"
    // Alternative format: BOOKING|SERVICE|DATE|TIME|NAME|PHONE
    
    const lowerMessage = messageText.toLowerCase().trim();
    
    // Check if message starts with booking command
    if (!lowerMessage.startsWith('booking ') && !lowerMessage.startsWith('book ') && !lowerMessage.startsWith('janji ')) {
      return null;
    }
    
    // Try pipe-separated format first
    if (messageText.includes('|')) {
      const parts = messageText.split('|').map(part => part.trim());
      if (parts.length >= 6) {
        return {
          command: parts[0].toLowerCase(),
          service: parts[1],
          date: parts[2],
          time: parts[3],
          customerName: parts[4],
          customerPhone: parts[5],
          notes: parts.length > 6 ? parts[6] : ''
        };
      }
    }
    
    // Try space-separated format with smart parsing
    const parts = messageText.trim().split(/\s+/);
    if (parts.length >= 6) {
      // Extract components intelligently
      const command = parts[0].toLowerCase();
      
      // Find date pattern (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
      let dateIndex = -1;
      let timeIndex = -1;
      
      for (let i = 1; i < parts.length; i++) {
        // Check for date patterns
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[i]) || 
            /^\d{2}\/\d{2}\/\d{4}$/.test(parts[i]) || 
            /^\d{2}-\d{2}-\d{4}$/.test(parts[i])) {
          dateIndex = i;
        }
        // Check for time pattern (HH:MM)
        if (/^\d{1,2}:\d{2}$/.test(parts[i])) {
          timeIndex = i;
        }
      }
      
      if (dateIndex > 0 && timeIndex > 0) {
        // Extract service (words between command and date)
        const service = parts.slice(1, dateIndex).join(' ');
        const date = parts[dateIndex];
        const time = parts[timeIndex];
        
        // Extract name and phone after time
        const remainingParts = parts.slice(timeIndex + 1);
        let customerName = '';
        let customerPhone = '';
        
        // Find phone number pattern
        for (let i = 0; i < remainingParts.length; i++) {
          if (/^[\+]?[0-9\-\(\)\s]{10,}$/.test(remainingParts[i].replace(/\s/g, ''))) {
            customerPhone = remainingParts[i];
            // Name is everything before phone
            customerName = remainingParts.slice(0, i).join(' ');
            break;
          }
        }
        
        // If no phone found, assume last part is phone and rest is name
        if (!customerPhone && remainingParts.length >= 2) {
          customerPhone = remainingParts[remainingParts.length - 1];
          customerName = remainingParts.slice(0, -1).join(' ');
        }
        
        if (service && date && time && customerName && customerPhone) {
          return {
            command,
            service,
            date,
            time,
            customerName,
            customerPhone,
            notes: ''
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing appointment message:', error);
    return null;
  }
}

// Helper function to validate appointment data
function validateAppointmentData(appointmentData) {
  const errors = [];
  
  // Validate service
  if (!appointmentData.service || appointmentData.service.trim().length < 2) {
    errors.push('❌ Nama layanan harus minimal 2 karakter');
  }
  
  // Validate and parse date
  let parsedDate = null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(appointmentData.date)) {
      parsedDate = new Date(appointmentData.date);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(appointmentData.date)) {
      const [day, month, year] = appointmentData.date.split('/');
      parsedDate = new Date(`${year}-${month}-${day}`);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(appointmentData.date)) {
      const [day, month, year] = appointmentData.date.split('-');
      parsedDate = new Date(`${year}-${month}-${day}`);
    }
    
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      errors.push('❌ Format tanggal tidak valid. Gunakan: YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY');
    } else {
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        errors.push('❌ Tanggal tidak boleh di masa lalu');
      }
      appointmentData.parsedDate = parsedDate;
    }
  } catch (error) {
    errors.push('❌ Format tanggal tidak valid');
  }
  
  // Validate time
  if (!/^\d{1,2}:\d{2}$/.test(appointmentData.time)) {
    errors.push('❌ Format waktu tidak valid. Gunakan: HH:MM (contoh: 14:30)');
  } else {
    const [hours, minutes] = appointmentData.time.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      errors.push('❌ Waktu tidak valid. Jam: 0-23, Menit: 0-59');
    }
  }
  
  // Validate customer name
  if (!appointmentData.customerName || appointmentData.customerName.trim().length < 2) {
    errors.push('❌ Nama pelanggan harus minimal 2 karakter');
  }
  
  // Validate phone number
  const phoneRegex = /^[\+]?[0-9\-\(\)\s]{10,}$/;
  if (!appointmentData.customerPhone || !phoneRegex.test(appointmentData.customerPhone.replace(/\s/g, ''))) {
    errors.push('❌ Nomor telepon tidak valid (minimal 10 digit)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: appointmentData
  };
}

// Helper function to format appointment confirmation message
function formatAppointmentConfirmation(appointment, service) {
  const dateStr = new Date(appointment.date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `✅ *APPOINTMENT BERHASIL DIBUAT*\n\n` +
         `🏷️ *Layanan:* ${service?.name || appointment.serviceName}\n` +
         `📅 *Tanggal:* ${dateStr}\n` +
         `⏰ *Waktu:* ${appointment.time}\n` +
         `👤 *Nama:* ${appointment.customerName}\n` +
         `📱 *Telepon:* ${appointment.customerPhone}\n` +
         `${appointment.notes ? `📝 *Catatan:* ${appointment.notes}\n` : ''}` +
         `\n💡 *ID Appointment:* ${appointment.id}\n` +
         `📋 *Status:* Menunggu Konfirmasi\n\n` +
         `Terima kasih! Kami akan menghubungi Anda untuk konfirmasi.`;
}

// Helper function to process appointment booking
async function processAppointmentBooking(botId, messageText, fromNumber) {
  try {
    console.log(`📅 Processing appointment booking for bot ${botId} from ${fromNumber}`);
    
    // Parse appointment from message
    const appointmentData = parseAppointmentMessage(messageText);
    if (!appointmentData) {
      return `❌ *FORMAT BOOKING SALAH*\n\n` +
             `Gunakan format:\n` +
             `*BOOKING [LAYANAN] [TANGGAL] [WAKTU] [NAMA] [TELEPON]*\n\n` +
             `Contoh:\n` +
             `• BOOKING Potong Rambut 2025-06-28 14:30 John Doe 081234567890\n` +
             `• BOOKING|Facial|28/06/2025|10:00|Jane Smith|087654321098\n\n` +
             `Format tanggal: YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY\n` +
             `Format waktu: HH:MM (24 jam)`;
    }
    
    // Validate appointment data
    const validation = validateAppointmentData(appointmentData);
    if (!validation.isValid) {
      return `❌ *DATA APPOINTMENT TIDAK VALID*\n\n` +
             validation.errors.join('\n') + '\n\n' +
             `Silakan perbaiki dan coba lagi.`;
    }
    
    // Format phone number
    let formattedPhone = appointmentData.customerPhone.replace(/[^\d\+]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('8') && !formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }
    
    // Create appointment via backend API
    try {
      const appointmentPayload = {
        serviceName: appointmentData.service,
        customerName: appointmentData.customerName.trim(),
        customerPhone: formattedPhone,
        date: appointmentData.parsedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: appointmentData.time,
        notes: `Dibuat via WhatsApp dari ${fromNumber}${appointmentData.notes ? `. ${appointmentData.notes}` : ''}`,
        source: 'whatsapp'
      };
      
      console.log('Creating appointment with payload:', appointmentPayload);
      
      const response = await axios.post(
        `${BACKEND_API_URL}/api/bots/${botId}/appointments-public`, 
        appointmentPayload
      );
      
      if (response.data.success) {
        const createdAppointment = response.data.data;
        return formatAppointmentConfirmation(createdAppointment, createdAppointment.service);
      } else {
        throw new Error(response.data.error || 'Failed to create appointment');
      }
      
    } catch (apiError) {
      console.error('Error creating appointment via API:', apiError.message);
      
      // Fallback: Return formatted message with instructions for manual processing
      return `⚠️ *BOOKING DATA DITERIMA*\n\n` +
             `Data booking Anda telah diterima dan akan diproses manual:\n\n` +
             `🏷️ *Layanan:* ${appointmentData.service}\n` +
             `📅 *Tanggal:* ${appointmentData.parsedDate.toLocaleDateString('id-ID')}\n` +
             `⏰ *Waktu:* ${appointmentData.time}\n` +
             `👤 *Nama:* ${appointmentData.customerName}\n` +
             `📱 *Telepon:* ${formattedPhone}\n\n` +
             `Admin akan menghubungi Anda untuk konfirmasi dalam 1x24 jam.\n\n` +
             `📞 Untuk pertanyaan urgent, hubungi langsung admin kami.`;
    }
    
  } catch (error) {
    console.error('Error processing appointment booking:', error);
    return `❌ *TERJADI KESALAHAN*\n\n` +
           `Maaf, terjadi kesalahan sistem saat memproses booking Anda.\n` +
           `Silakan coba lagi atau hubungi admin langsung.\n\n` +
           `Error: ${error.message}`;
  }
}

// Helper function to handle appointment inquiry
async function handleAppointmentInquiry(botId, messageText, fromNumber) {
  try {
    console.log(`📋 Processing appointment inquiry for bot ${botId} from ${fromNumber}`);
    
    const lowerMessage = messageText.toLowerCase().trim();
    
    // Check if it's a general appointment status request
    if (lowerMessage.includes('cek') && (lowerMessage.includes('janji') || lowerMessage.includes('appointment') || lowerMessage.includes('booking'))) {
      // Format phone number for search
      let formattedPhone = fromNumber.replace(/[^\d\+]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('8') && !formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
      }
      
      // Fetch appointments for this phone number
      try {
        const response = await axios.get(`${BACKEND_API_URL}/api/bots/${botId}/appointments-public`, {
          params: {
            customerPhone: formattedPhone,
            limit: 5
          }
        });
        
        if (response.data.success && response.data.data.length > 0) {
          const appointments = response.data.data;
          
          let replyMessage = `📋 *DAFTAR APPOINTMENT ANDA*\n\n`;
          
          appointments.forEach((apt, index) => {
            const dateStr = new Date(apt.date).toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            const statusEmoji = {
              'pending': '⏳',
              'confirmed': '✅',
              'completed': '✅',
              'cancelled': '❌',
              'no-show': '❌'
            };
            
            replyMessage += `${index + 1}. ${statusEmoji[apt.status] || '📅'} *${apt.serviceName}*\n`;
            replyMessage += `   📅 ${dateStr}\n`;
            replyMessage += `   ⏰ ${apt.time}\n`;
            replyMessage += `   📋 Status: ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}\n`;
            replyMessage += `   🆔 ID: ${apt.id}\n\n`;
          });
          
          replyMessage += `💡 Untuk ubah/batal appointment, hubungi admin kami.\n`;
          replyMessage += `📞 Atau gunakan ID appointment untuk referensi.`;
          
          return replyMessage;
        } else {
          return `📋 *TIDAK ADA APPOINTMENT*\n\n` +
                 `Kami tidak menemukan appointment atas nama nomor ${fromNumber}.\n\n` +
                 `💡 Untuk membuat appointment baru, gunakan format:\n` +
                 `BOOKING [LAYANAN] [TANGGAL] [WAKTU] [NAMA] [TELEPON]\n\n` +
                 `Contoh:\n` +
                 `BOOKING Potong Rambut 2025-06-28 14:30 John Doe ${fromNumber}`;
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return `❌ *TERJADI KESALAHAN*\n\n` +
               `Maaf, terjadi kesalahan saat mengambil data appointment.\n` +
               `Silakan coba lagi atau hubungi admin langsung.`;
      }
    }
    
    return null; // Not an appointment inquiry
  } catch (error) {
    console.error('Error handling appointment inquiry:', error);
    return null;
  }
}

// Process messages from Baileys (different from webhook messages)
async function processBaileysMessage(botId, message, sock) {
  try {
    const from = message.key.remoteJid;
    const messageText = message.message?.conversation || 
                      message.message?.extendedTextMessage?.text || '';
    
    const debugLog = `🚀 ${new Date().toISOString()} - Processing Baileys message for bot ${botId} from ${from}: "${messageText}"`;
    console.log(debugLog);
    
    // Write to debug file
    const fs = require('fs');
    fs.appendFileSync('/Users/yogaesamahendra/Project/BotLinko/webhook-debug.log', debugLog + '\n');
    
    console.log(`   📞 From: ${from}`);
    console.log(`   💬 Message: "${messageText}"`);
    console.log(`   🔍 Message object keys:`, Object.keys(message.message || {}));
    
    // Send to main API for processing and logging
    try {
      console.log(`📡 Sending message to API: ${process.env.API_BASE_URL}/api/process-message`);
      await axios.post(`${process.env.API_BASE_URL}/api/process-message`, {
        botId,
        from: from.replace('@s.whatsapp.net', ''),
        text: messageText,
        type: 'text',
        timestamp: new Date().toISOString(),
        source: 'baileys'
      });
      console.log(`✅ Message sent to API successfully`);
    } catch (apiError) {
      console.error('❌ Failed to send message to API:', apiError.message);
    }

    // ============ PRIORITY LEVEL 1: APPOINTMENT BOOKING ============
    // Check for appointment booking first (highest priority after system commands)
    const lowerMessage = messageText.toLowerCase().trim();
    const cleanFromNumber = from.replace('@s.whatsapp.net', '');
    
    if (lowerMessage.startsWith('booking ') || lowerMessage.startsWith('book ') || lowerMessage.startsWith('janji ')) {
      console.log(`📅 Processing appointment booking from ${cleanFromNumber}`);
      
      const reply = await processAppointmentBooking(botId, messageText, cleanFromNumber);
      if (reply) {
        console.log(`✅ Appointment booking reply generated`);
        await sock.sendMessage(from, { text: reply });
        console.log(`✅ Appointment booking reply sent successfully!`);
        return; // Exit early, don't process other rules
      }
    }
    
    // ============ PRIORITY LEVEL 2: APPOINTMENT INQUIRY ============
    // Check for appointment inquiry
    if (lowerMessage.includes('cek') && (lowerMessage.includes('janji') || lowerMessage.includes('appointment') || lowerMessage.includes('booking'))) {
      console.log(`📋 Processing appointment inquiry from ${cleanFromNumber}`);
      
      const reply = await handleAppointmentInquiry(botId, messageText, cleanFromNumber);
      if (reply) {
        console.log(`✅ Appointment inquiry reply generated`);
        await sock.sendMessage(from, { text: reply });
        console.log(`✅ Appointment inquiry reply sent successfully!`);
        return; // Exit early, don't process other rules
      }
    }

    // ============ PRIORITY LEVEL 3: AUTO-REPLY RULES ============
    // Check for auto-reply rules
    console.log(`🔍 Looking for auto-reply match...`);
    let reply = await findAutoReplyMatch(botId, messageText);
    
    if (reply) {
      console.log(`✅ Auto-reply match found: "${reply}"`);
    } else {
      console.log(`❌ No auto-reply match found and no default reply configured or disabled`);
    }
    
    // Send reply via Baileys only if reply exists
    if (reply) {
      console.log(`📤 Sending reply to ${from}: "${reply}"`);
      await sock.sendMessage(from, { text: reply });
      console.log(`✅ Reply sent successfully!`);
    } else {
      console.log(`⏭️ No reply to send - bot will remain silent`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing Baileys message for bot ${botId}:`, error);
  }
}

// Auto-reconnect existing sessions on startup
async function reconnectExistingSessions() {
  try {
    console.log('Checking for existing WhatsApp sessions...');
    
    if (!fs.existsSync(sessionsDir)) {
      return;
    }
    
    const sessionFolders = fs.readdirSync(sessionsDir);
    
    for (const folder of sessionFolders) {
      if (folder.startsWith('bot_')) {
        const botId = folder.replace('bot_', '');
        const authPath = path.join(sessionsDir, folder);
        
        try {
          // Check if session has valid credentials
          const credsPath = path.join(authPath, 'creds.json');
          if (fs.existsSync(credsPath)) {
            console.log(`Reconnecting bot ${botId}...`);
            await createWhatsAppConnection(botId);
          }
        } catch (error) {
          console.error(`Failed to reconnect bot ${botId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error reconnecting existing sessions:', error);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Webhook running on port ${PORT}`);
});

// Start by reconnecting existing sessions
reconnectExistingSessions();
