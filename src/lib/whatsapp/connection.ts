// lib/whatsapp/connection.ts
import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

let sock: WASocket | null = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 5000; // 5 seconds

export const getWhatsAppSocket = async (): Promise<WASocket> => {
  // Return existing socket if available and connected
  if (sock && sock.user) {
    return sock;
  }

  // Prevent multiple connection attempts
  if (isConnecting) {
    console.log('⏳ Connection already in progress, waiting...');
    return new Promise((resolve, reject) => {
      const checkConnection = setInterval(() => {
        if (!isConnecting && sock && sock.user) {
          clearInterval(checkConnection);
          resolve(sock);
        } else if (!isConnecting && !sock) {
          clearInterval(checkConnection);
          reject(new Error('Connection failed'));
        }
      }, 1000);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkConnection);
        reject(new Error('Connection timeout'));
      }, 30000);
    });
  }

  isConnecting = true;

  try {
    console.log('🔄 Initializing WhatsApp connection...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
      auth: state,
      browser: ["TSM", "Chrome", "1.0.0"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false, // Prevent auto-online to reduce connection issues
      getMessage: async () => undefined,
      printQRInTerminal: false, // We'll handle QR manually
    });

    return new Promise<WASocket>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        isConnecting = false;
        reject(new Error('Connection timeout - WhatsApp did not connect within 30 seconds'));
      }, 30000);

      sock!.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        console.log('📱 Connection update:', { connection, reason: lastDisconnect?.error?.message });

        if (qr) {
          const qrcode = await import('qrcode-terminal');
          console.log('🔐 Please scan the QR code to connect WhatsApp:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          clearTimeout(connectionTimeout);
          
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
          
          console.log('🔌 WhatsApp connection closed:', { statusCode, errorMessage });

          // Reset connection state
          sock = null;
          isConnecting = false;
          
          // Check if we should reconnect
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                statusCode !== DisconnectReason.badSession &&
                                connectionAttempts < MAX_RECONNECTION_ATTEMPTS;

          if (shouldReconnect) {
            connectionAttempts++;
            console.log(`🔁 Attempting reconnection (${connectionAttempts}/${MAX_RECONNECTION_ATTEMPTS}) in ${RECONNECTION_DELAY/1000}s...`);
            
            setTimeout(async () => {
              try {
                const newSock = await getWhatsAppSocket();
                resolve(newSock);
              } catch (error) {
                reject(error);
              }
            }, RECONNECTION_DELAY);
          } else {
            if (statusCode === DisconnectReason.loggedOut) {
              reject(new Error('WhatsApp logged out. Please scan QR code again.'));
            } else if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
              reject(new Error('Max reconnection attempts reached. Please restart the service.'));
            } else {
              reject(new Error(`Connection failed: ${errorMessage}`));
            }
          }
        }

        if (connection === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
        }

        if (connection === 'open') {
          clearTimeout(connectionTimeout);
          isConnecting = false;
          connectionAttempts = 0; // Reset attempts on successful connection
          
          console.log('✅ WhatsApp connected successfully!');
          console.log('📱 Connected as:', sock!.user?.name || sock!.user?.id);
          
          resolve(sock!);
        }
      });

      sock!.ev.on('creds.update', saveCreds);
    });

  } catch (error) {
    isConnecting = false;
    console.error('❌ Failed to initialize WhatsApp socket:', error);
    throw error;
  }
};

// Helper function to check if WhatsApp is connected
export const isWhatsAppConnected = (): boolean => {
  return sock !== null && sock.user !== undefined;
};

// Helper function to disconnect WhatsApp
export const disconnectWhatsApp = async (): Promise<void> => {
  if (sock) {
    console.log('🔌 Disconnecting WhatsApp...');
    await sock.logout();
    sock = null;
    isConnecting = false;
    connectionAttempts = 0;
  }
};

// Helper function to get connection status
export const getConnectionStatus = () => {
  return {
    connected: isWhatsAppConnected(),
    connecting: isConnecting,
    attempts: connectionAttempts,
    user: sock?.user || null
  };
};