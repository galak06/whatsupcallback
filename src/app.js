// server.js
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get('/webhook', (req, res) => {
  console.log('GET /webhook query:', req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Webhook verification failed');
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  console.log('\n--- Incoming POST /webhook ---');
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);

  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;

    // Status updates
    const status = change?.statuses?.[0];
    if (status?.recipient_id) {
      console.log('📩 Delivery status received:');
      console.log('   Recipient:', status.recipient_id);
      console.log('   Status:', status.status);
      console.log('   Timestamp:', status.timestamp);
    }

    // Incoming messages
    const message = change?.messages?.[0];
    if (message?.from) {
      const from = message.from;
      const text = message.text?.body || '';
      console.log('💬 Incoming message:');
      console.log('   From:', from);
      console.log('   Text:', text);

      const reply = text ? `You said: ${text}` : `Hello 👋`;

      console.log(`📤 Sending reply to ${from}...`);
      const resp = await fetch(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: reply },
          }),
        }
      );

      const data = await resp.json();
      console.log('✅ Reply API response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('🔥 Webhook processing error:', err);
  }
});

app.listen(PORT, () => console.log(`🚀 WhatsApp webhook listening on port ${PORT}`));
