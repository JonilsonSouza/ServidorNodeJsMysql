'use strict'

const debug = require('debug')('nodestr:server');
const http = require('http');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const router = express.Router();
const app = express();

const port = 7000;
app.set('port', port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let latestQr = null;
let latestQrAt = null;
let whatsappStatus = 'initializing';
let whatsappReady = false;

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

function formatWhatsappId(rawValue) {
  if (!rawValue) return null;
  if (rawValue.includes('@c.us') || rawValue.includes('@g.us')) return rawValue;
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return null;
  return `${digits}@c.us`;
}

// SELECIONAR TODOS OS USUARIOS DO BANCO CADASTRADOS
router.get('/users',(req,res,rows)=>{
	execSqlQuery("SELECT * FROM usuarios",res);
});
//SELECIONAR USUARIOS PELO CODIGO
router.get('/users/:id?',(req, res) => { 
    let filter = '';
    if(req.params.id) filter = (req.params.id);
    execSqlQuery(`SELECT * FROM  usuarios where codigo = "${filter}%";`, res);
    
});

//SELECIONAR USUARIOS PELO NOME
router.get('/users/pesquisa/:name?',(req, res) => { 
    let filter = '';
    if(req.params.name) filter = (req.params.name);
    execSqlQuery(`SELECT * FROM  usuarios where nome LIKE "${filter}%";`, res);
    
});

router.get('/whatsapp/status', (req, res) => {
  res.json({
    status: whatsappStatus,
    ready: whatsappReady,
    qrAvailable: Boolean(latestQr),
    qrGeneratedAt: latestQrAt
  });
});

router.get('/whatsapp/qr', (req, res) => {
  if (!latestQr) {
    res.status(404).json({ message: 'QR code indisponível no momento.' });
    return;
  }

  res.json({
    qr: latestQr,
    generatedAt: latestQrAt
  });
});

router.get('/whatsapp/qr/image', (req, res) => {
  if (!latestQr) {
    res.status(404).json({ message: 'QR code indisponível no momento.' });
    return;
  }

  const base64Data = latestQr.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  res.setHeader('Content-Type', 'image/png');
  res.send(imageBuffer);
});

router.get('/whatsapp/qr-page', (req, res) => {
  if (!latestQr) {
    res.status(404).send('<h1>QR code indisponível no momento.</h1>');
    return;
  }

  res.send(`
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>WhatsApp QR</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 40px;">
        <h1>Escaneie o QR Code</h1>
        <img src="${latestQr}" alt="QR Code do WhatsApp" style="max-width: 320px;" />
        <p>Atualizado em: ${latestQrAt || '-'}</p>
      </body>
    </html>
  `);
});

router.post('/whatsapp/send', async (req, res) => {
  if (!whatsappReady) {
    res.status(409).json({ message: 'WhatsApp não está pronto. Escaneie o QR code primeiro.' });
    return;
  }

  const destination = formatWhatsappId(req.body.to);
  const message = req.body.message;

  if (!destination || !message) {
    res.status(400).json({ message: 'Informe "to" e "message" no corpo da requisição.' });
    return;
  }

  try {
    const response = await whatsappClient.sendMessage(destination, message);
    res.json({
      id: response.id.id,
      to: destination,
      status: 'sent'
    });
  } catch (error) {
    res.status(500).json({ message: 'Falha ao enviar mensagem.', error: error.message });
  }
});

const server = http.createServer(app);

module.exports = router;
app.use('/', router);

server.listen(port);
console.log('Api rodando na porta  ' + port);

function execSqlQuery(sqlInsert, res) {
      const connection = mysql.createConnection({
        host: "localhost",
        port: "3306",
        user: "root",
        password: "root",
        database: "banconodejs"
    });
    connection.query(sqlInsert, function (error, results, fields) {
        if (error)
            console.log('executou!');

        else
            res.json(results);
        connection.end();
        console.log('executou!');
    });
}
app.post('/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      message: 'Informe "to" e "message" no corpo da requisição.'
    });
  }

  try {
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    await client.sendMessage(chatId, message);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      message: 'Falha ao enviar mensagem.',
      error: err.message
    });
  }
});
