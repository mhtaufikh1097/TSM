// lib/whatsapp/connection.ts
import { makeWASocket, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { createCredentialStorage, CredentialStorage } from './credential-storage';

let sock: WASocket | null = null;
let currentQRCode: string | null = null;
let isConnected: boolean = false;
let credentialStorage: CredentialStorage;
let isConnecting: boolean = false; // Prevent multiple connections

// Event emitter untuk status changes
export const connectionEvents = new EventEmitter();

export const getWhatsAppSocket = async (): Promise<WASocket> => {
  // Check if we already have a working socket
  if (sock && sock.user && sock.authState?.creds?.me) {
    console.log('🔄 [DEBUG] Existing socket found, checking connection...')
    
    // Force update connection status if socket looks good
    if (!isConnected) {
      console.log('🔧 [DEBUG] Fixing connection status - socket exists but not marked connected')
      isConnected = true
      connectionEvents.emit('connectionChange', true)
    }
    
    return sock;
  }

  // Prevent multiple concurrent connections
  if (isConnecting) {
    throw new Error('Connection already in progress');
  }

  isConnecting = true;

  try {
    // Clean up existing socket first
    if (sock) {
      try {
        sock.ws?.close();
      } catch (e) {
        // Ignore cleanup errors
      }
      sock = null;
    }

    // Initialize credential storage if not already done
    if (!credentialStorage) {
      credentialStorage = createCredentialStorage();
    }

    // Get auth state from storage (file or database)
    const { state, saveCreds } = await credentialStorage.getAuthState();

    sock = makeWASocket({
      version: [2, 3000, 1025091846],
      auth: state,
      browser: ["WIKA-TSM", "Desktop", "1.0"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      getMessage: async () => undefined,
    });

    // Wait for connection to open
    return new Promise<WASocket>((resolve, reject) => {
      const timeout = setTimeout(() => {
        isConnecting = false;
        // Don't reject if we have QR code, user might still be scanning
        if (!currentQRCode) {
          reject(new Error('Connection timeout'));
        } else {
          console.log('⏳ QR Code available but not scanned yet - connection will continue waiting...');
        }
      }, 120000); // 2 minutes timeout instead of 30 seconds

      sock!.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            // Generate QR code for UI (not terminal)
            currentQRCode = await QRCode.toDataURL(qr, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            console.log('🔐 QR Code generated for UI - please scan to connect');
            // Reset timeout when QR is generated
            clearTimeout(timeout);
          } catch (qrError) {
            console.error('❌ Failed to generate QR code:', qrError);
          }
        }

        if (connection === 'close') {
          clearTimeout(timeout);
          isConnecting = false;
          
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          const errorMessage = (lastDisconnect?.error as Boom)?.message || 'Unknown error';
          
          console.log(`🔌 WhatsApp connection closed: ${errorMessage}`);
          
          isConnected = false;
          sock = null;
          connectionEvents.emit('connectionChange', false);
          
          if (shouldReconnect && !errorMessage.includes('conflict')) {
            console.log('🔁 Will reconnect in 5 seconds...');
            setTimeout(() => {
              getWhatsAppSocket().catch(console.error);
            }, 5000);
          }
          
          reject(new Error(errorMessage));
        }

        if (connection === 'open') {
          clearTimeout(timeout);
          isConnecting = false;
          
          console.log('✅ WhatsApp connected successfully!');
          currentQRCode = null; // Clear QR code when connected
          isConnected = true;
          connectionEvents.emit('connectionChange', true);
          resolve(sock!);
        }
      });

      // Handle credentials update
      sock!.ev.on('creds.update', saveCreds);
    });
  } catch (error) {
    isConnecting = false;
    throw error;
  }
};

// Simple disconnect function
export const disconnectWhatsApp = async (): Promise<void> => {
  try {
    isConnecting = false;
    
    if (sock) {
      try {
        sock.ws?.close();
      } catch (e) {
        // Ignore cleanup errors
      }
      sock = null;
    }
    
    isConnected = false;
    currentQRCode = null;
    
    console.log('🔌 WhatsApp disconnected');
    connectionEvents.emit('connectionChange', false);
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
  }
};

// Simple restart function
export const restartWhatsAppConnection = async (): Promise<void> => {
  console.log('🔄 Restarting WhatsApp connection...');
  await disconnectWhatsApp();
  
  // Wait a bit before reconnecting
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await getWhatsAppSocket();
  } catch (error) {
    console.error('Failed to restart connection:', error);
    throw error;
  }
};

// Get QR code for UI
export const getCurrentQRCode = (): string | null => {
  return currentQRCode;
};

// Simple connection status check
export const isWhatsAppConnected = (): boolean => {
  console.log(`🔍 [DEBUG] Connection check: sock=${!!sock}, isConnected=${isConnected}, user=${!!sock?.user}, creds=${!!sock?.authState?.creds?.me}`)
  
  // If no socket, definitely not connected
  if (!sock) return false;
  
  // Check if user is authenticated - this is the key indicator
  const hasUser = !!sock.user
  const hasCreds = !!sock.authState?.creds?.me
  
  // If we have user info or credentials, we're likely connected
  if (hasUser || hasCreds) {
    // Auto-fix connection status if needed
    if (!isConnected) {
      console.log('🔧 [DEBUG] Auto-fixing connection status - socket authenticated but not marked connected')
      isConnected = true
      connectionEvents.emit('connectionChange', true)
    }
    return true
  }
  
  return isConnected // Fallback to manual flag
};
