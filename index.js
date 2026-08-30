import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import axios from 'axios';
import http from 'http';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
const YOUR_NUMBER = '923252874471' // <-- tumhara number yahi rahega

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // QR band
    })

    // YE WALA HISSA NAYA CODE DEGA
    if (!state.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(YOUR_NUMBER)
            console.log("========== PAIRING CODE: " + code + " ==========")
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'open') console.log('Bot is Online!')
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        }
    })

    sock.e
