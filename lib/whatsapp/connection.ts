// lib/whatsapp/connection.ts
import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';

let sock: WASocket | null = null;
let socketReady: Promise<void> | null = null;
let currentQRCode: string | null = null;
let isConnected: boolean = false; // Explicitly type as boolean to prevent undefined
let isConnecting: boolean = false; // Explicitly type as boolean to prevent undefined
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds delay between reconnects

// Event emitter untuk status changes
export const connectionEvents = new EventEmitter();

export const getWhatsAppSocket = async (): Promise<WASocket> => {
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

  isConnecting = true;

  try {
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
      version: [2, 3000, 1025091846], // Community recommended stable version
      auth: state,
      browser: ["Ubuntu", "Chrome", "22.04.4"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false, // Reduce server load
      getMessage: async () => undefined,
      keepAliveIntervalMs: 60000, // Keep alive every 60 seconds
      connectTimeoutMs: 20000, // 20 second connection timeout
      defaultQueryTimeoutMs: 60000, // 60 second query timeout
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
          
          // Handle specific error types
          if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
            console.log('⚠️ Multiple session conflict detected - will retry with longer delay');
            reconnectAttempts = Math.min(reconnectAttempts + 2, MAX_RECONNECT_ATTEMPTS); // Increase attempts faster for conflicts
          }
          
          console.log(`🔌 WhatsApp connection closed: ${errorMessage} (${statusCode})`);
          // Explicitly set boolean values to prevent undefined
          isConnected = false;
          isConnecting = false;
          console.log(`ℹ️ Connection state set to: ${isConnected}`);
          connectionEvents.emit('connectionChange', false);
          
          if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            sock = null;
            reconnectAttempts++;
            
            // Use longer delay for conflict errors
            const delay = errorMessage.includes('conflict') ? RECONNECT_DELAY * 2 : RECONNECT_DELAY;
            console.log(`🔁 Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay/1000}s`);
            
            // Delay before reconnection to prevent spam
            reconnectTimeout = setTimeout(async () => {
              try {
                await getWhatsAppSocket();
              } catch (error) {
                console.error('🚫 Reconnection failed:', error);
                isConnecting = false;
              }
            }, delay);
          } else {
            console.log('🛑 Max reconnection attempts reached or logged out');
            isConnecting = false;
            reject(new Error('Connection failed after maximum attempts'));
          }
        }

        if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully!');
          console.log('🔗 Connection state: OPEN');
          currentQRCode = null; // Clear QR code when connected
          // Explicitly set boolean values to prevent undefined
          isConnected = true;
          isConnecting = false;
          reconnectAttempts = 0; // Reset attempts counter
          console.log(`ℹ️ Connection state set to: ${isConnected}`);
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
      sock.ws?.close();
      sock = null;
    }
    
    // Explicitly set boolean values to prevent undefined
    isConnected = false;
    isConnecting = false;
    currentQRCode = null;
    reconnectAttempts = 0;
    
    console.log('🔌 WhatsApp disconnected cleanly');
    console.log(`ℹ️ Connection state set to: ${isConnected}`);
    connectionEvents.emit('connectionChange', false);
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
  }
};

// Fungsi untuk restart connection
export const restartWhatsAppConnection = async (): Promise<void> => {
  console.log('🔄 Restarting WhatsApp connection...');
  await disconnectWhatsApp();
  
  // Wait a bit before reconnecting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    await getWhatsAppSocket();
  } catch (error) {
    console.error('Failed to restart connection:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan QR code
export const getCurrentQRCode = (): string | null => {
  return currentQRCode;
};

// Fungsi untuk check status koneksi
export const isWhatsAppConnected = (): boolean => {
  // Simplified check - hanya rely pada isConnected flag yang di-set oleh connection events
  // Ensure we always return a boolean, never undefined
  const connected: boolean = Boolean(isConnected && sock !== null);
  console.log(`🔍 [DEBUG] isWhatsAppConnected: ${connected} (isConnected=${isConnected}, sock=${!!sock})`);
  return connected;
};
