import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';
import qrcode from 'qrcode-terminal'; // QR ke liye naya package

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // QR ON kar diya
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr){
            console.log("Scan this QR from WhatsApp > Linked Devices")
            qrcode.generate(qr, {small: true}) // Railway logs mein QR ban jayega
        }
        if(connection === 'open') console.log('Bot is Online!')
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        }
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text
            if(text){
                const res = await axios.post(DIFY_API_URL, {
                    inputs: {},
                    query: text,
                    response_mode: "blocking",
                    user: msg.key.remoteJid
                }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }})
                await sock.sendMessage(msg.key.remoteJid, { text: res.data.answer })
            }
        }
    })
}
startBot()

// Railway ke liye
http.createServer().listen(process.env.PORT || 3000);
