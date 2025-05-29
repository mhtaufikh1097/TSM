// lib/whatsapp/connection.ts
import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
let sock: WASocket | null = null;
let socketReady: Promise<void> | null = null;


export const getWhatsAppSocket = async (): Promise<WASocket> => {
  if (sock) return sock;

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    browser: ["Ubuntu", "Chrome", "22.04.4"],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    getMessage: async () => undefined,
  });

  socketReady = new Promise<void>((resolve, reject) => {
    sock!.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrcode = await import('qrcode-terminal');
        qrcode.generate(qr, { small: true });
        console.log('🔐 Scan QR code:', qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('🔌 WhatsApp connection closed');
        if (shouldReconnect) {
          sock = null;
          console.log('🔁 Reconnecting...');
          await getWhatsAppSocket();
        }
      }

      if (connection === 'open') {
        console.log('✅ WhatsApp connected!');
        resolve(); // <<=== TANDA READY
      }
    });
  });

  sock.ev.on('creds.update', saveCreds);

  await socketReady; // Tunggu sampai koneksi benar-benar terbuka

  return sock!;
};