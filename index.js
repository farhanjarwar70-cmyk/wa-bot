import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';
import fs from 'fs';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
const YOUR_NUMBER = '923252874471';

let reconnecting = false;

async function startBot() {
    if(reconnecting) return;
    reconnecting = true;

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    if (!state.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(YOUR_NUMBER);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log("\n========== PAIRING CODE: " + code + " ==========\n");
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'open') {
            console.log('✅ Bot Online');
            reconnecting = false;
        }
        if(connection === 'close') {
            if(lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
            }
            setTimeout(() => { reconnecting = false; startBot(); }, 10000);
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if(text){
                const res = await axios.post(DIFY_API_URL, {
                    inputs: {}, query: text, response_mode: "blocking", user: msg.key.remoteJid
                }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }});
                await sock.sendMessage(msg.key.remoteJid, { text: res.data.answer });
            }
        }
    });
}

startBot();
http.createServer().listen(process.env.PORT || 3000);
