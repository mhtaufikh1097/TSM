const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const client = new Client();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});


client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
});

client.initialize();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.post('/send', async (req, res) => {
  const { name, email } = req.body;
  const message = `📩 Formulir Baru\n\n👤 Nama: ${name}\n📧 Email: ${email}`;


  const number = 'nomor_wa'; // nomor WhatsApp tujuan
  const chatId = `${number}@c.us`;

  try {
    await client.sendMessage(chatId, message);
    res.send('Pesan berhasil dikirim ke WhatsApp!');
  } catch (error) {
    console.error('Gagal mengirim pesan:', error);
    res.status(500).send('Gagal mengirim pesan.');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
