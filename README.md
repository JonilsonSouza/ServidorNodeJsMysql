# Servidor Node + WhatsApp

Este projeto expõe uma API simples em Express, com acesso ao MySQL e integração com o WhatsApp (via `whatsapp-web.js`) para automação de mensagens.

## Pré-requisitos

- Node.js instalado (versão LTS recomendada).
- Google Chrome/Chromium instalado no servidor (obrigatório para o `whatsapp-web.js`).
- MySQL disponível conforme configuração em `server.js`.

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. (Opcional) Informe o caminho do Chrome/Chromium via variável de ambiente:
   ```bash
   export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"
   ```

3. Suba a API:
   ```bash
   npm start
   ```

## Fluxo de autenticação do WhatsApp

1. Abra o QR para autenticar:
   - `GET /whatsapp/qr-page` (página HTML com o QR)
   - `GET /whatsapp/qr` (retorna o QR em base64)
   - `GET /whatsapp/qr/image` (retorna o PNG)

2. Verifique o status:
   - `GET /whatsapp/status`

Quando o status for `ready`, já é possível enviar mensagens.

## Enviar mensagem

`POST /whatsapp/send`

Body JSON:
```json
{
  "to": "5511999999999",
  "message": "Olá! Mensagem automática."
}
```

Observação: o campo `to` pode ser o número puro ou com sufixo `@c.us`.
