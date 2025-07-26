// lib/whatsapp/connection.ts
import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { createCredentialStorage, CredentialStorage } from './credential-storage';

let sock: WASocket | null = null;
let socketReady: Promise<void> | null = null;
let currentQRCode: string | null = null;
let isConnected: boolean = false; // Explicitly type as boolean to prevent undefined
let isConnecting: boolean = false; // Explicitly type as boolean to prevent undefined
let connectionLock: boolean = false; // Add connection lock to prevent multiple attempts

// Initialize connection state explicitly to prevent undefined
const initializeConnectionState = () => {
  isConnected = false;
  isConnecting = false;
  connectionLock = false;
  console.log('🔧 Connection state initialized:', { isConnected, isConnecting, connectionLock });
};
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5 to prevent excessive retries
const RECONNECT_DELAY = 10000; // Increased from 5000 to 10 seconds delay

// Session conflict prevention
let sessionId: string | null = null;
let lastConnectionTime = 0;
const MIN_CONNECTION_INTERVAL = 30000; // 30 seconds minimum between connections

// Credential storage instance
let credentialStorage: CredentialStorage;

// Event emitter untuk status changes
export const connectionEvents = new EventEmitter();

export const getWhatsAppSocket = async (): Promise<WASocket> => {
  // Initialize connection state to prevent undefined
  if (typeof isConnected === 'undefined') {
    initializeConnectionState();
  }

  // Prevent rapid reconnections to avoid conflicts
  const now = Date.now();
  if (now - lastConnectionTime < MIN_CONNECTION_INTERVAL && sock && isConnected) {
    console.log(`⏰ Preventing rapid reconnection (${(MIN_CONNECTION_INTERVAL - (now - lastConnectionTime))/1000}s remaining)`);
    return sock;
  }

  // Add connection lock to prevent multiple simultaneous attempts
  if (connectionLock) {
    console.log('🔒 Connection locked, waiting for current attempt to complete...');
    return new Promise((resolve, reject) => {
      const waitForConnection = () => {
        if (!connectionLock && sock && isConnected) {
          resolve(sock);
        } else if (!connectionLock && !isConnecting) {
          // Lock released but no connection, try again
          getWhatsAppSocket().then(resolve).catch(reject);
        } else {
          setTimeout(waitForConnection, 500);
        }
      };
      waitForConnection();
    });
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('⏳ Connection attempt already in progress...');
    return sock || await new Promise((resolve) => {
      const checkConnection = () => {
        if (sock && !isConnecting) {
          resolve(sock);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  if (sock && isConnected) {
    console.log('♻️ Using existing connection');
    return sock;
  }

  // Set locks and update timing
  connectionLock = true;
  isConnecting = true;
  lastConnectionTime = now;

  try {
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Initialize credential storage if not already done
    if (!credentialStorage) {
      credentialStorage = createCredentialStorage();
    }

    // Get auth state from storage (file or database)
    const { state, saveCreds } = await credentialStorage.getAuthState();
    
    // Debug: Check state before creating socket
    console.log('🔍 [DEBUG] Auth state before socket creation:');
    console.log('  - Creds exists:', !!state.creds);
    console.log('  - Me property:', state.creds?.me ? 'exists' : 'MISSING');
    if (state.creds?.me) {
      console.log('  - Me ID:', state.creds.me.id);
    } else {
      console.log('  - Creds object:', JSON.stringify(state.creds, null, 2));
    }

    // Generate unique session ID to prevent conflicts
    if (!sessionId) {
      sessionId = `WIKA-${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    sock = makeWASocket({
      version: [2, 3000, 1025091846], // Community recommended stable version
      auth: state,
      browser: ["WIKA-TSM", "Desktop", sessionId], // Use unique session ID
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false, // Reduce server load and prevent conflicts
      getMessage: async () => undefined,
      keepAliveIntervalMs: 45000, // Increased to 45 seconds to reduce conflicts
      connectTimeoutMs: 90000, // Increased to 90 seconds for better stability
      defaultQueryTimeoutMs: 60000, // 60 second query timeout
      retryRequestDelayMs: 15000, // Increased delay between retries
      maxMsgRetryCount: 1, // Reduced to 1 to prevent conflicts
      // Add session conflict prevention
      emitOwnEvents: false, // Prevent duplicate events
      shouldIgnoreJid: () => false,
      shouldSyncHistoryMessage: () => false,
    });

    socketReady = new Promise<void>((resolve, reject) => {
      sock!.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            // Generate QR code untuk UI
            currentQRCode = await QRCode.toDataURL(qr, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            console.log('🔐 QR Code generated for UI');
          } catch (qrError) {
            console.error('❌ Failed to generate QR code:', qrError);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          const errorMessage = (lastDisconnect?.error as Boom)?.message || 'Unknown error';
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          
          console.log(`🔌 WhatsApp connection closed: ${errorMessage} (${statusCode})`);
          
          // Handle specific error types - ENHANCED CONFLICT HANDLING
          if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
            console.log('⚠️ Session conflict detected - implementing aggressive recovery');
            
            // For conflicts, clear session data and wait longer
            sessionId = null; // Force new session ID
            reconnectAttempts = Math.min(reconnectAttempts + 2, MAX_RECONNECT_ATTEMPTS); // Penalize conflicts more
            
            // Clear existing socket immediately
            if (sock) {
              try {
                sock.ws?.close();
                sock = null;
              } catch (cleanupError) {
                console.log('🧹 Socket cleanup during conflict:', cleanupError);
              }
            }
            
            console.log('🚨 Conflict recovery: New session will be created');
          } else {
            reconnectAttempts++;
          }
          
          // Explicitly set boolean values and release locks
          isConnected = false;
          isConnecting = false;
          connectionLock = false; // Release lock on connection close
          console.log(`ℹ️ Connection state set to: ${isConnected}, lock released`);
          connectionEvents.emit('connectionChange', false);
          
          if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            sock = null;
            
            // Enhanced delay calculation based on error type and attempt count
            let delay = RECONNECT_DELAY;
            if (errorMessage.includes('conflict')) {
              // For conflicts, use aggressive exponential backoff
              delay = RECONNECT_DELAY * Math.pow(3, reconnectAttempts - 1); // More aggressive backoff
              delay = Math.min(delay, 180000); // Cap at 3 minutes for conflicts
            } else {
              delay = RECONNECT_DELAY * reconnectAttempts;
            }
            
            console.log(`🔁 Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay/1000}s`);
            
            // Delay before reconnection to prevent spam
            reconnectTimeout = setTimeout(async () => {
              try {
                connectionLock = false; // Release lock before retry
                await getWhatsAppSocket();
              } catch (error) {
                console.error('🚫 Reconnection failed:', error);
                isConnecting = false;
                connectionLock = false; // Ensure lock is released on error
              }
            }, delay);
          } else {
            console.log('🛑 Max reconnection attempts reached or logged out');
            // Reset session for fresh start
            sessionId = null;
            reconnectAttempts = 0;
            isConnecting = false;
            connectionLock = false;
            reject(new Error('Connection failed after maximum attempts'));
          }
        }

        if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully!');
          console.log('🔗 Connection state: OPEN');
          currentQRCode = null; // Clear QR code when connected
          // Explicitly set boolean values and release locks
          isConnected = true;
          isConnecting = false;
          connectionLock = false; // Release lock on successful connection
          reconnectAttempts = 0; // Reset attempts counter
          console.log(`ℹ️ Connection state set to: ${isConnected}, lock released`);
          console.log('📡 Emitting connection change: true');
          connectionEvents.emit('connectionChange', true);
          resolve(); // <<=== TANDA READY
        }
      });

      // Handle credentials update
      sock!.ev.on('creds.update', saveCreds);
    });

    await socketReady; // Tunggu sampai koneksi benar-benar terbuka
    return sock!;

  } catch (error) {
    console.error('🚫 WhatsApp connection error:', error);
    isConnecting = false;
    connectionLock = false; // Ensure lock is released on error
    throw error;
  }
};

// Fungsi untuk disconnect dan cleanup
export const disconnectWhatsApp = async (): Promise<void> => {
  try {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (sock) {
      try {
        // Graceful disconnect
        sock.ws?.close();
        sock.end(undefined);
      } catch (endError) {
        console.log('🧹 Socket end error (expected):', endError);
      }
      sock = null;
    }
    
    // Reset all state including session
    isConnected = false;
    isConnecting = false;
    connectionLock = false;
    currentQRCode = null;
    reconnectAttempts = 0;
    sessionId = null; // Reset session ID for fresh start
    lastConnectionTime = 0;
    
    console.log('🔌 WhatsApp disconnected cleanly with session reset');
    console.log(`ℹ️ Connection state set to: ${isConnected}, all locks released`);
    connectionEvents.emit('connectionChange', false);
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
  }
};

// Fungsi untuk restart connection
export const restartWhatsAppConnection = async (): Promise<void> => {
  console.log('🔄 Restarting WhatsApp connection...');
  await disconnectWhatsApp();
  
  // Wait longer before reconnecting to prevent conflicts
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await getWhatsAppSocket();
  } catch (error) {
    console.error('Failed to restart connection:', error);
    throw error;
  }
};

// New function: Force session reset to resolve persistent conflicts
export const forceSessionReset = async (): Promise<void> => {
  console.log('🚨 Force session reset initiated...');
  
  // Disconnect everything
  await disconnectWhatsApp();
  
  // Clear credentials if database mode
  if (credentialStorage) {
    try {
      await credentialStorage.clearCredentials();
      console.log('🗄️ Credentials cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear credentials:', error);
    }
  }
  
  // Reset all connection variables
  sessionId = null;
  lastConnectionTime = 0;
  reconnectAttempts = 0;
  
  console.log('✅ Force session reset completed - ready for fresh connection');
};

// Fungsi untuk mendapatkan QR code
export const getCurrentQRCode = (): string | null => {
  return currentQRCode;
};

// Fungsi untuk check status koneksi
export const isWhatsAppConnected = (): boolean => {
  // Initialize state if undefined
  if (typeof isConnected === 'undefined') {
    console.log('⚠️ Connection state was undefined, initializing...');
    initializeConnectionState();
  }
  
  // Enhanced validation checks
  try {
    // 1. Check basic connection state
    if (!isConnected) {
      return false;
    }
    
    // 2. Check if we have a socket
    if (!sock) {
      console.log('⚠️ Socket is null despite connection flag');
      isConnected = false;
      return false;
    }
    
    // 3. Check socket connection status - baileys has different way to check
    if (!sock.user) {
      console.log('⚠️ Socket user info missing - likely disconnected');
      isConnected = false;
      return false;
    }
    
    // 4. Check credentials
    if (!sock.authState?.creds?.me) {
      console.log('⚠️ Missing credentials in socket auth state');
      isConnected = false;
      return false;
    }
    
    // All checks passed
    return true;
    
  } catch (error) {
    console.error('❌ Error checking connection state:', error);
    isConnected = false;
    return false;
  }
  
  // Enhanced validation for connection status
  const hasSocket = sock !== null && sock !== undefined;
  const flagState = Boolean(isConnected);
  const hasCredentials = sock?.authState?.creds?.me !== undefined;
  
  const finalState = hasSocket && flagState && hasCredentials;
  
  console.log(`🔍 [DEBUG] Connection check: hasSocket=${hasSocket}, flagState=${flagState}, hasCreds=${hasCredentials}, final=${finalState}`);
  
  return finalState;
};
