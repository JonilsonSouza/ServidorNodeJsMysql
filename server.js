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
router.post('/whatsapp/send', async (req, res) => {
  if (!whatsappReady) {
    return res.status(409).json({
      message: 'WhatsApp não está pronto. Escaneie o QR.'
    });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      message: 'Informe "to" e "message" no corpo da requisição.'
    });
  }

  try {
    const number = to.replace(/\D/g, '');
    const chatId = `${number}@c.us`;

    // 🔥 FORÇA O CARREGAMENTO DO CHAT
    const chat = await whatsappClient.getChatById(chatId);

    await chat.sendMessage(message);

    res.json({
      success: true,
      to: chatId
    });

  } catch (error) {
    res.status(500).json({
      message: 'Falha ao enviar mensagem.',
      error: error.message
    });
  }
});
