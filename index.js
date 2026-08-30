import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
const YOUR_NUMBER = '923252874468' // <-- YAHAN APNA NUMBER LIKHO

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // QR band kar diya
    })

    // Agar pehli baar hai to pairing code mangwao
    if (!state.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(YOUR_NUMBER)
            console.log("========== PAIRING CODE: " + code + " ==========")
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if(connection === 'open') console.log('Bot is Online!')
        if(connection === 'close') startBot() // agar cut ho to dubara chalu
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text
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

// Railway ke liye
http.createServer().listen(process.env.PORT || 3000);
