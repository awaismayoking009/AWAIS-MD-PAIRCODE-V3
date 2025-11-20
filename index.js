const { makeWASocket, useMultiFileAuthState, jidNormalizedUser } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const PAIRING_NUMBER = process.env.PAIRING_NUMBER; 

async function startPairCodeGenerator() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Awais MD PairCode', 'Chrome', '1.0.0']
    });

    if (!sock.authState.creds.registered) {
        if (!PAIRING_NUMBER) {
            console.log('PAIRING_NUMBER is missing in config. Bot will use default pairing method.');
        }

        if (!Object.keys(sock.store.keys).length) {
            console.log("Generating pair code...");
            const code = await sock.requestPairingCode(PAIRING_NUMBER.replace(/[^0-9]/g, ''));
            console.log("Pairing Code: " + code);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = lastDisconnect.error.output.statusCode !== 515 ? lastDisconnect.error : new Error('Connection closed');
            if (reason.output.statusCode !== 401) { 
                startPairCodeGenerator();
            } else {
                console.log('Logged out. Please delete the auth_info folder and restart.');
            }
        } else if (connection === 'open') {
            console.log('Bot connected successfully!');
        }
    });

    app.get('/', (req, res) => {
        res.send('AWAIS MD BOT is running.');
    });

    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

startPairCodeGenerator();
      
