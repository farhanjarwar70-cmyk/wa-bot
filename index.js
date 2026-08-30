import makeWASocket, { DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';
import fs from 'fs';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
const YOUR_NUMBER = '923252874471'; // apna number

let sock;
let reconnecting = false;

async function startBot() {
    if(reconnecting) return; // double restart roke ga
    reconnecting = true;

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        logger: { level: 'silent' } // logs saaf rakhne ke liye
    });

    sock.ev.on('creds.update', saveCreds);

    // Pairing code sirf pehli baar
    if (!state.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(YOUR_NUMBER);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n\n========== PAIRING CODE: " + code + " ==========\n\n");
            } catch (err) {
                console.log("Pairing code error:", err.message);
            }
        }, 5000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if(connection === 'open') {
            console.log('✅ Bot is Online!');
            reconnecting = false;
        }

        if(connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('❌ Connection closed. Status:', statusCode);

            // Agar logout nahi hua to 10 sec baad restart
            if(statusCode!== DisconnectReason.loggedOut) {
                setTimeout(() => {
                    reconnecting = false;
                    startBot();
                }, 10000);
            } else {
                // Logout ho gaya to session delete karo
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                console.log("Session deleted. New code will generate");
                setTimeout(() => {
                    reconnecting = false;
                    startBot();
                }, 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        try {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.message) {
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if(text){
                    const res = await axios.post(DIFY_API_URL, {
                        inputs: {}, query: text, response_mode: "blocking", user: msg.key.remoteJid
                    }, { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }, timeout: 30000 });

                    await sock.sendMessage(msg.key.remoteJid, { text: res.data.answer });
                }
            }
        } catch (err) {
            console.log("Message error:", err.message);
        }
    });
}

startBot();

// Railway ko zinda rakhne ke liye
http.createServer((req, res) => res.end('OK')).listen(process.env.PORT || 3000);
