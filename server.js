const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Format phone number to 254XXXXXXXXX
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return '254' + cleaned;
  } else if (cleaned.startsWith('254') && (cleaned.length === 12)) {
    return cleaned;
  }
  return cleaned;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post('/api/bulk-stk', async (req, res) => {
  const { phone_numbers, amount, reference } = req.body;

  if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one phone number.' });
  }

  if (!amount || Number(amount) < 1) {
    return res.status(400).json({ error: 'Amount must be at least 1 KES.' });
  }

  const results = [];
  const delayMs = 4000; // 15 requests per minute = 60,000ms / 15 = 4,000ms delay

  for (let i = 0; i < phone_numbers.length; i++) {
    const rawNumber = phone_numbers[i];
    const formattedPhone = formatPhoneNumber(rawNumber);

    const payload = {
      channel_id: isNaN(process.env.UPESIPAY_CHANNEL_ID) 
        ? process.env.UPESIPAY_CHANNEL_ID 
        : Number(process.env.UPESIPAY_CHANNEL_ID),
      phone_number: formattedPhone,
      amount: Number(amount)
    };

    if (process.env.UPESIPAY_CALLBACK_URL) {
      payload.callback_url = process.env.UPESIPAY_CALLBACK_URL;
    }

    try {
      const response = await axios.post(
        'https://upesipay.com/api/v2/collections/initiate/',
        payload,
        {
          headers: {
            'Authorization': process.env.UPESIPAY_AUTH_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      results.push({
        phone: formattedPhone,
        reference: reference || 'N/A',
        status: 'SUCCESS',
        checkout_request_id: response.data?.data?.checkout_request_id || 'N/A',
        message: response.data?.message || 'STK Push initiated successfully.'
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'STK Push failed';
      results.push({
        phone: formattedPhone,
        reference: reference || 'N/A',
        status: 'FAILED',
        error: errorMsg
      });
    }

    // Delay between iterations to respect the 15 req/min limit
    if (i < phone_numbers.length - 1) {
      await delay(delayMs);
    }
  }

  return res.json({ total: phone_numbers.length, results });
});

// UpesiPay Payment Webhook Receiver
app.post('/webhook/callback', (req, res) => {
  console.log('--- Incoming UpesiPay Callback ---');
  console.log(JSON.stringify(req.body, null, 2));
  return res.status(200).json({ status: 'received' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
