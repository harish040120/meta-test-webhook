const express = require('express');
const app = express();
const https = require('https');

// Middleware to parse JSON bodies
app.use(express.json());

// === CONFIG ===
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = '1201303469727476';
const WHATSAPP_ACCESS_TOKEN = 'EAAOB5yPxaIMBRhZBjs5edgW4ccuBAOMZB8vIyLDwgEyKgNfPyuH0Y1PWaRyoQwr7JSZArFyl9WKVbWvMxtMbbjGFsvAP3V80Mxo5nyJqCK1rXMp3UoBLjdOYik92tHYyZChZCjRMDOfVQcHkLHekTRIpju0iLe48XnoagmYwz9jKgcSuGAv1P1dIB0DMUHaIncUKsLZCcVJAOOO1ZB3VStDiuinqgPZCwkhEPrn7NZByOfP3vaDaZAAB30yesBNkdykq1Dp1sd82kKxY031VglGWTs';

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
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// === WEBHOOK RECEIVES MESSAGES (POST) ===
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}`);
  console.log(JSON.stringify(req.body, null, 2));

  // Process incoming messages
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

              // Auto-reply with a confirmation
              const reply = `Echo: "${msgBody}"`;
              const result = await sendWhatsAppMessage(from, reply);
              console.log('Reply sent:', JSON.stringify(result, null, 2));
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
});

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
  console.log('  GET  /              — Webhook verification');
  console.log('  POST /              — Webhook receives messages');
  console.log('  POST /send          — Send a text message (no auth)');
  console.log('  POST /send-template — Send a template message (no auth)');
});
