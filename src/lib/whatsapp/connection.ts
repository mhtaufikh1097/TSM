// lib/whatsapp/connection.ts
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  WASocket, 
  ConnectionState,
  AuthenticationState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';

// Create a proper logger to reduce noise
const logger = P({ level: 'warn' });

interface WhatsAppConnection {
  socket: WASocket | null;
  isConnecting: boolean;
  connectionPromise: Promise<WASocket> | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

const connection: WhatsAppConnection = {
  socket: null,
  isConnecting: false,
  connectionPromise: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createSocket = async (): Promise<WASocket> => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      logger,
      browser: ["MyApp", "Chrome", "1.0.0"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false, // Changed to false to avoid issues
      getMessage: async () => undefined,
      shouldIgnoreJid: () => false,
      retryRequestDelayMs: 10000,
      maxMsgRetryCount: 3,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    return new Promise<WASocket>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 60 seconds'));
      }, 60000);

      sock.ev.on('connection.update', async (update) => {
        const { connection: connState, lastDisconnect, qr } = update;
        
        console.log('Connection update:', { 
          connection: connState, 
          timestamp: new Date().toISOString() 
        });

        if (qr) {
          try {
            const qrcode = await import('qrcode-terminal');
            qrcode.generate(qr, { small: true });
            console.log('🔐 Please scan the QR code above');
          } catch (err) {
            console.log('🔐 QR Code:', qr);
          }
        }

        if (connState === 'open') {
          clearTimeout(timeout);
          connection.socket = sock;
          connection.isConnecting = false;
          connection.reconnectAttempts = 0;
          console.log('✅ WhatsApp connected successfully!');
          resolve(sock);
        }

        if (connState === 'close') {
          clearTimeout(timeout);
          connection.socket = null;
          connection.isConnecting = false;
          
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log('🔌 WhatsApp connection closed:', {
            statusCode,
            shouldReconnect,
            error: lastDisconnect?.error?.message
          });

          if (shouldReconnect && connection.reconnectAttempts < connection.maxReconnectAttempts) {
            connection.reconnectAttempts++;
            console.log(`🔁 Reconnecting... (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`);
            
            // Wait before reconnecting with exponential backoff
            const backoffDelay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts - 1), 30000);
            await delay(backoffDelay);
            
            // Clear the current connection promise to allow new attempts
            connection.connectionPromise = null;
            
            // Don't resolve/reject here, let the retry happen naturally
          } else {
            const error = new Error(
              statusCode === DisconnectReason.loggedOut 
                ? 'WhatsApp session logged out. Please scan QR code again.'
                : `WhatsApp connection failed after ${connection.maxReconnectAttempts} attempts`
            );
            reject(error);
          }
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // Handle socket errors
      sock.ev.on('connection.error', (error) => {
        console.error('WhatsApp connection error:', error);
      });
    });

  } catch (error) {
    connection.isConnecting = false;
    connection.connectionPromise = null;
    throw error;
  }
};

export const getWhatsAppSocket = async (): Promise<WASocket> => {
  // Return existing socket if available and connected
  if (connection.socket && connection.socket.user) {
    return connection.socket;
  }

  // If already connecting, wait for the existing promise
  if (connection.isConnecting && connection.connectionPromise) {
    try {
      return await connection.connectionPromise;
    } catch (error) {
      // If the promise failed, we'll create a new one below
      connection.connectionPromise = null;
      connection.isConnecting = false;
    }
  }

  // Create new connection
  if (!connection.connectionPromise) {
    connection.isConnecting = true;
    connection.connectionPromise = createSocket();
  }

  return connection.connectionPromise;
};

export const isWhatsAppConnected = (): boolean => {
  return !!(connection.socket && connection.socket.user);
};

export const disconnectWhatsApp = async (): Promise<void> => {
  if (connection.socket) {
    await connection.socket.logout();
    connection.socket = null;
    connection.connectionPromise = null;
    connection.isConnecting = false;
    connection.reconnectAttempts = 0;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down WhatsApp connection...');
  await disconnectWhatsApp();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down WhatsApp connection...');
  await disconnectWhatsApp();
  process.exit(0);
});