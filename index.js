// @ts-nocheck
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

const DIFY_API_KEY = process.env.DIFY_API_KEY; 
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('SCAN THIS QR ONCE:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => console.log('Bot is Online! ✅'));

client.on('message', async (msg) => {
    if (msg.fromMe || msg.from.includes('@g.us')) return; 
    try {
        const response = await axios.post(DIFY_API_URL, {
            inputs: {}, query: msg.body, response_mode: "blocking", user: msg.from
        }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}`, 'Content-Type': 'application/json' } });
        await msg.reply(response.data.answer);
    } catch (error) {
        console.log('Error:', error.message);
        await msg.reply('Yo give me 1 sec 😅');
    }
});

client.initialize();

app.get('/', (req, res) => res.send('Bot is running!')); 
app.listen(PORT, () => console.log(`Server on port ${PORT}`));