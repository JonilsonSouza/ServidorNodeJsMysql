'use strict';

const http = require('http');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const router = express.Router();
const port = 7000;

/* =========================
   CONFIGURAÇÕES BÁSICAS
========================= */
app.set('port', port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* =========================
   STATUS DO WHATSAPP
========================= */
let latestQr = null;
let latestQrAt = null;
let whatsappStatus = 'initializing';
let whatsappReady = false;

/* =========================
   WHATSAPP CLIENT
========================= */
const whatsappPuppeteerOptions = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  whatsappPuppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: whatsappPuppeteerOptions
});

/* =========================
   EVENTOS DO WHATSAPP
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
  console.log('✅ WhatsApp conectado');
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
   FUNÇÕES AUXILIARES
========================= */
function formatWhatsappId(rawValue) {
  if (!rawValue) return null;
  if (rawValue.includes('@c.us') || rawValue.includes('@g.us')) return rawValue;

  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return null;

  return `${digits}@c.us`;
}

function execSqlQuery(sql, res) {
  const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: 'banconodejs'
  });

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro no banco de dados' });
    } else {
      res.json(results);
    }
    connection.end();
  });
}

/* =========================
   ROTAS DE USUÁRIOS
========================= */
router.get('/users', (req, res) => {
  execSqlQuery('SELECT * FROM usuarios', res);
});

router.get('/users/:id', (req, res) => {
  execSqlQuery(
    `SELECT * FROM usuarios WHERE codigo LIKE "${req.params.id}%"`,
    res
  );
});

router.get('/users/pesquisa/:name', (req, res) => {
  execSqlQuery(
    `SELECT * FROM usuarios WHERE nome LIKE "${req.params.name}%"`,
    res
  );
});

/* =========================
   ROTAS DO WHATSAPP
========================= */
router.get('/whatsapp/status', (req, res) => {
  res.json({
    status: whatsappStatus,
    ready: whatsappReady,
    qrAvailable: Boole
