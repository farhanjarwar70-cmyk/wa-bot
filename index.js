import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
const NUMBER = '923252874471'; // apna number 92 wala

async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    // Pehli baar pairing code
    if (!state.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(NUMBER);
            console.log('PAIRING CODE:', code.match(/.{1,4}/g).join('-'));
        }, 3000);
    }

    // Connection
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log('Bot Connected');
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) connect();
        }
    });

    // Message
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (text) {
                const res = await axios.post(DIFY_API_URL, {
                    inputs: {},
                    query: text,
                    response_mode: "blocking",
                    user: msg.key.remoteJid
                }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }});

                await sock.sendMessage(msg.key.remoteJid, { text: res.data.answer });
            }
        }
    });
}

connect();

// Railway ke liye
http.createServer((req, res) => res.end('ok')).listen(process.env.PORT || 3000);
