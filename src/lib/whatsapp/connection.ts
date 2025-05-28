// lib/whatsapp/connection.ts
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  WASocket, 
  ConnectionState,
  AuthenticationState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';

// Create a proper logger to reduce noise
const logger = P({ level: 'error' }); // Changed to error level

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
  maxReconnectAttempts: 3 // Reduced attempts
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createSocket = async (): Promise<WASocket> => {
  try {
    // Clear any existing auth state if reconnecting after error 515
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Fetch latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version}, is latest: ${isLatest}`);
    
    const sock = makeWASocket({
      version, // Add version
      auth: state,
      logger,
      browser: ["Ubuntu", "Chrome", "20.0.04"], // Changed browser info
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      getMessage: async () => undefined,
      shouldIgnoreJid: () => false,
      retryRequestDelayMs: 5000, // Reduced delay
      maxMsgRetryCount: 2, // Reduced retries
      connectTimeoutMs: 30000, // Reduced timeout
      defaultQueryTimeoutMs: 30000, // Reduced timeout
      keepAliveIntervalMs: 30000, // Increased keep alive
      printQRInTerminal: false, // Disable auto QR print
      qrTimeout: 40000, // Add QR timeout
      // Add additional options for stability
      emitOwnEvents: false,
      fireInitQueries: true,
      shouldSyncHistoryMessage: () => false,
    });

    return new Promise<WASocket>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 30 seconds'));
      }, 30000);

      let qrGenerated = false;

      sock.ev.on('connection.update', async (update) => {
        const { connection: connState, lastDisconnect, qr, receivedPendingNotifications } = update;
        
        console.log('Connection update:', { 
          connection: connState, 
          timestamp: new Date().toISOString(),
          hasQR: !!qr,
          receivedPendingNotifications
        });

        if (qr && !qrGenerated) {
          qrGenerated = true;
          try {
            const qrcode = await import('qrcode-terminal');
            console.log('\n🔐 Scan QR Code below:');
            qrcode.generate(qr, { small: true });
            console.log('📱 Open WhatsApp > Linked Devices > Link a Device');
          } catch (err) {
            console.log('🔐 QR Code (manual):', qr);
          }
        }

        if (connState === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
        }

        if (connState === 'open') {
          clearTimeout(timeout);
          connection.socket = sock;
          connection.isConnecting = false;
          connection.reconnectAttempts = 0;
          console.log('✅ WhatsApp connected successfully!');
          console.log('📱 Connected as:', sock.user?.name || 'Unknown');
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
            reason: getDisconnectReason(statusCode),
            shouldReconnect,
            error: lastDisconnect?.error?.message
          });

          // Handle specific error codes
          if (statusCode === 515) {
            console.log('🚨 Stream error detected - clearing auth state...');
            // You might want to clear auth state here for error 515
            // await clearAuthState();
          }

          if (shouldReconnect && connection.reconnectAttempts < connection.maxReconnectAttempts) {
            connection.reconnectAttempts++;
            console.log(`🔁 Reconnecting... (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`);
            
            // Wait before reconnecting with exponential backoff
            const backoffDelay = Math.min(2000 * Math.pow(2, connection.reconnectAttempts - 1), 15000);
            console.log(`⏱️  Waiting ${backoffDelay}ms before reconnect...`);
            await delay(backoffDelay);
            
            // Clear the current connection promise to allow new attempts
            connection.connectionPromise = null;
            
            // Restart connection process
            try {
              const newSocket = await createSocket();
              resolve(newSocket);
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              reject(retryError);
            }
          } else {
            const error = new Error(
              statusCode === DisconnectReason.loggedOut 
                ? 'WhatsApp session logged out. Please scan QR code again.'
                : `WhatsApp connection failed after ${connection.maxReconnectAttempts} attempts. Status: ${getDisconnectReason(statusCode)}`
            );
            reject(error);
          }
        }
      });

      sock.ev.on('creds.update', async (creds) => {
        try {
          await saveCreds();
          console.log('💾 Credentials saved');
        } catch (error) {
          console.error('Failed to save credentials:', error);
        }
      });

      // Note: connection.error event is not available in current Baileys version
      // Errors are handled through connection.update event when connection state is 'close'

      // Add message events for debugging
      sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type === 'notify') {
          console.log('📨 New message received');
        }
      });
    });

  } catch (error) {
    connection.isConnecting = false;
    connection.connectionPromise = null;
    console.error('🚨 Socket creation failed:', error);
    throw error;
  }
};

// Helper function to get disconnect reason
const getDisconnectReason = (statusCode: number | undefined): string => {
  switch (statusCode) {
    case DisconnectReason.badSession:
      return 'Bad Session File';
    case DisconnectReason.connectionClosed:
      return 'Connection Closed';
    case DisconnectReason.connectionLost:
      return 'Connection Lost';
    case DisconnectReason.connectionReplaced:
      return 'Connection Replaced';
    case DisconnectReason.loggedOut:
      return 'Logged Out';
    case DisconnectReason.restartRequired:
      return 'Restart Required';
    case DisconnectReason.timedOut:
      return 'Timed Out';
    case 515:
      return 'Stream Error (515)';
    default:
      return `Unknown (${statusCode})`;
  }
};

// Function to clear auth state (use carefully!)
const clearAuthState = async (): Promise<void> => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const authPath = path.resolve('auth_info_baileys');
    await fs.rm(authPath, { recursive: true, force: true });
    console.log('🗑️  Auth state cleared');
  } catch (error) {
    console.log('Auth state already clear or error clearing:', error);
  }
};

export const getWhatsAppSocket = async (): Promise<WASocket> => {
  // Return existing socket if available and connected
  if (connection.socket && connection.socket.user) {
    try {
      // Test if socket is still alive by checking if it's open
      if (connection.socket.ws && connection.socket.ws.isOpen) {
        return connection.socket;
      }
    } catch (error) {
      console.log('Socket health check failed:', error);
      connection.socket = null;
    }
  }

  // If already connecting, wait for the existing promise
  if (connection.isConnecting && connection.connectionPromise) {
    try {
      return await connection.connectionPromise;
    } catch (error) {
      console.log('Existing connection promise failed:', error);
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
  try {
    if (!connection.socket || !connection.socket.user) {
      return false;
    }
    
    // Check WebSocket state using isOpen property
    return connection.socket.ws?.isOpen === true;
  } catch (error) {
    return false;
  }
};
export const disconnectWhatsApp = async (): Promise<void> => {
  try {
    if (connection.socket) {
      console.log('🔌 Disconnecting WhatsApp...');
      await connection.socket.logout();
    }
  } catch (error) {
    console.log('Error during logout:', error);
  } finally {
    connection.socket = null;
    connection.connectionPromise = null;
    connection.isConnecting = false;
    connection.reconnectAttempts = 0;
    console.log('✅ WhatsApp disconnected');
  }
};

// Force reconnect function
export const forceReconnect = async (): Promise<WASocket> => {
  console.log('🔄 Force reconnecting...');
  await disconnectWhatsApp();
  await delay(2000);
  return getWhatsAppSocket();
};

// Clear auth and reconnect (use when getting persistent 515 errors)
export const clearAuthAndReconnect = async (): Promise<WASocket> => {
  console.log('🗑️  Clearing auth state and reconnecting...');
  await disconnectWhatsApp();
  await clearAuthState();
  await delay(3000);
  return getWhatsAppSocket();
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down WhatsApp connection...');
  await disconnectWhatsApp();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});