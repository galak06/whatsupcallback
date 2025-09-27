// server.js
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Permanent/long-lived token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // e.g. "838141212706716"

// Verification (needed by Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming events
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respond quickly to Meta

  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;

    // For delivery/read receipts
    const status = change?.statuses?.[0];
    if (status?.recipient_id) {
      const phone = status.recipient_id;
      console.log('Delivery status for phone:', phone);
    }

    // For incoming messages
    const message = change?.messages?.[0];
    if (message?.from) {
      const from = message.from;            // sender phone
      const text = message.text?.body || ''; // text content
      console.log(`Message from ${from}: ${text}`);

      // Reply back
      const reply = text ? `You said: ${text}` : `Hello 👋`;

      await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: { body: reply }
        })
      });

      console.log('Replied to:', from);
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }
});

app.listen(PORT, () => console.log(`Webhook listening on :${PORT}`));
