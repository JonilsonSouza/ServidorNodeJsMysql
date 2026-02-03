'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const router = express.Router();
const port = 7000;

/* =========================
   MIDDLEWARE
========================= */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* =========================
   STATUS WHATSAPP
========================= */
let latestQr = null;
let latestQrAt = null;
let whatsappStatus = 'initializing';
let whatsappReady = false;

/* =========================
   CLIENTE WHATSAPP
========================= */
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

/* =========================
   EVENTOS
========================= */
whatsappClient.on('qr', async (qr) => {
  latestQr = await qrcode.toDataURL(qr);
  latestQrAt = new Date().toISOString();
  whatsappStatus = 'qr';
  whatsappReady = false;
});

whatsappClient.on('ready', () => {
  latestQr = null;
  latestQrAt = null;
  whatsappStatus = 'ready';
  whatsappReady = true;
  console.log('WhatsApp conectado');
});

whatsappClient.on('auth_failure', () => {
  whatsappStatus = 'auth_failure';
  whatsappReady = false;
});

whatsappClient.on('disconnected', () => {
  whatsappStatus = 'disconnected';
  whatsappReady = false;
});

whatsappClient.initialize();

/* =========================
   FUNÇÕES
========================= */
function formatWhatsappId(value) {
  if (!value) return null;
  if (value.includes('@c.us')) return value;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return `${digits}@c.us`;
}

/* =========================
   ROTAS
========================= */
router.get('/whatsapp/status', (req, res) => {
  res.json({
    status: whatsappStatus,
    ready: whatsappReady
  });
});

router.get('/whatsapp/qr-page', (req, res) => {
  if (!latestQr) {
    return res.send('<h1>QR Code indisponível</h1>');
  }

  res.send(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>WhatsApp QR</title>
      </head>
      <body style="text-align:center;font-family:Arial">
        <h1>Escaneie o QR Code</h1>
        <img src="${latestQr}" />
        <p>${latestQrAt}</p>
      </body>
    </html>
  `);
});

router.post('/whatsapp/send', async (req, res) => {
  if (!whatsappReady) {
    return res.status(409).json({
      message: 'WhatsApp não está pronto. Escaneie o QR.'
    });
  }

  const { to, message } = req.body;
  const chatId = formatWhatsappId(to);

  if (!chatId || !message) {
    return res.status(400).json({
      message: 'Informe "to" e "message" no corpo da requisição.'
    });
  }

  try {
    await whatsappClient.sendMessage(chatId, message);
    res.json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({
      message: 'Falha ao enviar mensagem.',
      error: err.message
    });
  }
});

/* =========================
   SERVER
========================= */
app.use('/', router);

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
