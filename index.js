import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import http from 'http';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update
        if(qr) qrcode.generate(qr, {small: true})
        if(connection === 'open') console.log('Bot is Online!')
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text
            // yahan Dify ko call karna hai
            const res = await axios.post(DIFY_API_URL, {
                inputs: {},
                query: text,
                response_mode: "blocking",
                user: msg.key.remoteJid
            }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }})
            await sock.sendMessage(msg.key.remoteJid, { text: res.data.answer })
        }
    })
}
startBot()

// Railway ke liye port
http.createServer().listen(process.env.PORT || 3000);
