const express = require('express');
const app = express();
const https = require('https');

// Middleware to parse JSON bodies
app.use(express.json());

// === CONFIG ===
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = '1201303469727476';
const WHATSAPP_ACCESS_TOKEN = 'EAAOB5yPxaIMBR0eXaebsnNCCwclg4ga7d8exhsgAlUsylWCmTb0ZBIKNFZCqRIb3qcUIMFsQnOOtNFoYHowccVNCWxfzMT0kbEWQTA2WX1kkdWBGYmcre5gfZAKAiOjtliTaNacFiqM9xhVHmHmtW9r40LzbULWyaFyq1OMT2yiiCZBCfGrJ41aZBGZAbliy0UoR5HNskNIOu2a72JOR3Lylza0kAbd7O5AZBz2paPr06rdQRO4pcWVJW73NcenyQidgfggjgV4TKVAZCRecX8mA';
const N8N_WEBHOOK_URL = 'https://outcome-were-musicians-links.trycloudflare.com/webhook/whatsapp-reply';

// === HELPER: Forward message to n8n ===
function forwardToN8n(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(N8N_WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });

    req.on('error', (err) => {
      console.error('Failed to forward to n8n:', err.message);
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

// === HELPER: Send WhatsApp message ===
function sendWhatsAppMessage(to, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    });

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// === WEBHOOK VERIFICATION (GET) ===
// Accepts both / and /webhook
function handleVerification(req, res) {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
}

app.get('/', handleVerification);
app.get('/webhook', handleVerification);

// === WEBHOOK RECEIVES MESSAGES (POST) ===
// Accepts both / and /webhook
async function handleWebhook(req, res) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}`);
  console.log(JSON.stringify(req.body, null, 2));

  // Forward to n8n for processing (n8n handles replies)
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];

      if (changes?.field === 'messages') {
        const messages = changes.value?.messages;

        if (messages) {
          for (const msg of messages) {
            const from = msg.from;
            const msgBody = msg.text?.body;

            if (msgBody) {
              console.log(`\nMessage from ${from}: ${msgBody}`);
              console.log('Forwarding to n8n...');
              forwardToN8n(body).then((n8nRes) => {
                console.log('n8n response:', JSON.stringify(n8nRes, null, 2));
              }).catch((err) => {
                console.error('n8n forward failed:', err.message);
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
  }

  // Always respond 200 to Meta
  res.status(200).end();
}

app.post('/', handleWebhook);
app.post('/webhook', handleWebhook);

// === SEND MESSAGE ENDPOINT (POST /send) ===
// No authentication — use freely
// Body: { "to": "916379470943", "text": "Hello!" }
app.post('/send', async (req, res) => {
  const { to, text } = req.body;

  if (!to || !text) {
    return res.status(400).json({ error: 'Missing "to" or "text" in request body' });
  }

  console.log(`\nSending message to ${to}: ${text}`);

  try {
    const result = await sendWhatsAppMessage(to, text);
    console.log('Message sent:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === SEND TEMPLATE ENDPOINT (POST /send-template) ===
// No authentication — use freely
// Body: { "to": "916379470943", "template": "hello_world", "language": "en_US" }
app.post('/send-template', async (req, res) => {
  const { to, template, language } = req.body;

  if (!to || !template) {
    return res.status(400).json({ error: 'Missing "to" or "template" in request body' });
  }

  console.log(`\nSending template "${template}" to ${to}`);

  try {
    const payload = JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: template,
        language: { code: language || 'en_US' }
      }
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log('Template sent:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error('Template send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
  console.log('Endpoints:');
  console.log('  GET  / or /webhook         — Webhook verification');
  console.log('  POST / or /webhook         — Webhook receives messages, forwards to n8n');
  console.log('  POST /send                 — Send a text message (no auth)');
  console.log('  POST /send-template        — Send a template message (no auth)');
  console.log('');
  console.log('Meta webhook URL: https://meta-test-webhook-fcfc.onrender.com/');
  console.log('n8n forward URL: ' + N8N_WEBHOOK_URL);
});
