const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const PhoneNumber = require('awesome-phonenumber');
const { initializeScheduler } = require('./utils/scheduler');
const { loadConfig, saveConfig, loadContacts, saveContacts } = require('./utils/configManager');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.qrCode = null;
        this.pairingCode = null;
        this.pairingNumber = null;
        this.isConnected = false;
        this.config = loadConfig();
        this.app = express();
        this.setupWebServer();
    }

    setupWebServer() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('web'));

        // API endpoints
        this.app.get('/api/status', (req, res) => {
            res.json({
                connected: this.isConnected,
                qrCode: this.qrCode,
                pairingCode: this.pairingCode,
                pairingNumber: this.pairingNumber
            });
        });

        // Request pairing code endpoint
        this.app.post('/api/request-code', async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                
                if (!phoneNumber) {
                    return res.status(400).json({ success: false, message: 'Nomor telepon diperlukan' });
                }

                // Format phone number for Indonesia
                let formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
                
                // Handle Indonesian phone number formats
                if (formattedNumber.startsWith('08')) {
                    formattedNumber = '62' + formattedNumber.substring(1);
                } else if (formattedNumber.startsWith('8')) {
                    formattedNumber = '62' + formattedNumber;
                } else if (!formattedNumber.startsWith('62')) {
                    formattedNumber = '62' + formattedNumber;
                }
                
                // Basic validation
                if (formattedNumber.length < 10 || formattedNumber.length > 15) {
                    return res.status(400).json({ success: false, message: 'Nomor telepon tidak valid' });
                }
                this.pairingNumber = formattedNumber;

                if (this.sock) {
                    const code = await this.sock.requestPairingCode(formattedNumber);
                    this.pairingCode = code;
                    
                    res.json({ 
                        success: true, 
                        code: code,
                        message: `Kode pairing dikirim: ${code}`,
                        phoneNumber: formattedNumber
                    });
                } else {
                    res.status(400).json({ success: false, message: 'Bot belum terkoneksi' });
                }
            } catch (error) {
                console.error('Error requesting pairing code:', error);
                res.status(500).json({ success: false, message: 'Gagal meminta kode pairing: ' + error.message });
            }
        });

        this.app.get('/api/config', (req, res) => {
            res.json(this.config);
        });

        this.app.post('/api/config', (req, res) => {
            try {
                this.config = { ...this.config, ...req.body };
                saveConfig(this.config);
                // Restart scheduler with new config
                if (this.sock && this.isConnected) {
                    initializeScheduler(this.sock, this.config);
                }
                res.json({ success: true, message: 'Konfigurasi berhasil disimpan' });
            } catch (error) {
                console.error('Error saving config:', error);
                res.status(500).json({ success: false, message: 'Gagal menyimpan konfigurasi' });
            }
        });

        this.app.get('/api/groups', async (req, res) => {
            try {
                if (!this.sock || !this.isConnected) {
                    return res.status(400).json({ success: false, message: 'Bot belum terkoneksi ke WhatsApp' });
                }

                const groups = await this.sock.groupFetchAllParticipating();
                const groupList = Object.values(groups).map(group => ({
                    id: group.id,
                    name: group.subject,
                    participants: group.participants.length
                }));

                res.json({ success: true, groups: groupList });
            } catch (error) {
                console.error('Error fetching groups:', error);
                res.status(500).json({ success: false, message: 'Gagal mengambil daftar grup' });
            }
        });

        // Test message endpoint
        this.app.post('/api/test-message', async (req, res) => {
            try {
                const { shiftId } = req.body;
                
                if (!this.sock || !this.isConnected) {
                    return res.status(400).json({ success: false, message: 'Bot belum terkoneksi ke WhatsApp' });
                }

                if (!shiftId || !this.config.shifts[shiftId]) {
                    return res.status(400).json({ success: false, message: 'Shift tidak valid' });
                }

                if (!this.config.groups || this.config.groups.length === 0) {
                    return res.status(400).json({ success: false, message: 'Tidak ada grup aktif untuk test' });
                }

                const { triggerManualReminder } = require('./utils/scheduler');
                const result = await triggerManualReminder(this.sock, shiftId);
                
                res.json({ 
                    success: true, 
                    message: `Test message berhasil dikirim ke ${result.groupCount} grup` 
                });
            } catch (error) {
                console.error('Error sending test message:', error);
                res.status(500).json({ success: false, message: error.message || 'Gagal mengirim test message' });
            }
        });

        // Debug scheduler endpoint
        this.app.get('/api/scheduler-status', (req, res) => {
            try {
                const { getSchedulerStatus } = require('./utils/scheduler');
                const status = getSchedulerStatus();
                const moment = require('moment-timezone');
                const nowWIB = moment().tz('Asia/Jakarta');
                
                res.json({
                    success: true,
                    currentTime: {
                        wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
                        utc: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                    },
                    scheduler: status,
                    config: this.config
                });
            } catch (error) {
                console.error('Error getting scheduler status:', error);
                res.status(500).json({ success: false, message: 'Gagal mendapatkan status scheduler' });
            }
        });

        // Broadcast message endpoint
        this.app.post('/api/broadcast', async (req, res) => {
            try {
                const { message, targets, type } = req.body;
                
                if (!this.sock || !this.isConnected) {
                    return res.status(400).json({ success: false, message: 'Bot belum terkoneksi ke WhatsApp' });
                }

                if (!message || !message.trim()) {
                    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
                }

                if (!targets || targets.length === 0) {
                    return res.status(400).json({ success: false, message: 'Pilih target penerima pesan' });
                }

                let successCount = 0;
                let failedCount = 0;
                const errors = [];

                for (const target of targets) {
                    try {
                        let recipientId;
                        
                        if (type === 'group') {
                            recipientId = target; // target is group ID
                        } else if (type === 'phone') {
                            // Format phone number
                            let formattedNumber = target.replace(/\D/g, '');
                            if (formattedNumber.startsWith('08')) {
                                formattedNumber = '62' + formattedNumber.substring(1);
                            } else if (formattedNumber.startsWith('8')) {
                                formattedNumber = '62' + formattedNumber;
                            } else if (!formattedNumber.startsWith('62')) {
                                formattedNumber = '62' + formattedNumber;
                            }
                            recipientId = formattedNumber + '@s.whatsapp.net';
                        }

                        await this.sock.sendMessage(recipientId, { text: message });
                        successCount++;
                        
                        // Add delay to avoid spam detection
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        failedCount++;
                        errors.push(`${target}: ${error.message}`);
                        console.error(`Error sending to ${target}:`, error);
                    }
                }

                const resultMessage = `Broadcast selesai! Berhasil: ${successCount}, Gagal: ${failedCount}`;
                
                res.json({ 
                    success: true, 
                    message: resultMessage,
                    details: {
                        success: successCount,
                        failed: failedCount,
                        errors: errors
                    }
                });
            } catch (error) {
                console.error('Error sending broadcast:', error);
                res.status(500).json({ success: false, message: error.message || 'Gagal mengirim broadcast' });
            }
        });

        // Contact groups endpoints
        this.app.get('/api/contacts', (req, res) => {
            try {
                const contacts = loadContacts();
                res.json({ success: true, contacts: contacts.contactGroups });
            } catch (error) {
                console.error('Error loading contacts:', error);
                res.status(500).json({ success: false, message: 'Gagal memuat kontak' });
            }
        });

        this.app.post('/api/contacts', (req, res) => {
            try {
                const { groupName, phoneNumbers } = req.body;
                
                if (!groupName || !groupName.trim()) {
                    return res.status(400).json({ success: false, message: 'Nama grup kontak diperlukan' });
                }

                if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
                    return res.status(400).json({ success: false, message: 'Minimal satu nomor telepon diperlukan' });
                }

                // Validate and format phone numbers
                const validNumbers = [];
                const invalidNumbers = [];

                phoneNumbers.forEach(number => {
                    const cleanNumber = number.trim().replace(/\D/g, '');
                    if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
                        let formattedNumber = cleanNumber;
                        if (formattedNumber.startsWith('08')) {
                            formattedNumber = '62' + formattedNumber.substring(1);
                        } else if (formattedNumber.startsWith('8')) {
                            formattedNumber = '62' + formattedNumber;
                        } else if (!formattedNumber.startsWith('62')) {
                            formattedNumber = '62' + formattedNumber;
                        }
                        validNumbers.push(formattedNumber);
                    } else {
                        invalidNumbers.push(number);
                    }
                });

                if (validNumbers.length === 0) {
                    return res.status(400).json({ success: false, message: 'Tidak ada nomor yang valid' });
                }

                const contacts = loadContacts();
                contacts.contactGroups[groupName] = {
                    name: groupName,
                    numbers: validNumbers,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                saveContacts(contacts);

                let message = `Grup kontak "${groupName}" berhasil disimpan dengan ${validNumbers.length} nomor`;
                if (invalidNumbers.length > 0) {
                    message += `. ${invalidNumbers.length} nomor tidak valid diabaikan`;
                }

                res.json({ success: true, message, invalidNumbers });
            } catch (error) {
                console.error('Error saving contacts:', error);
                res.status(500).json({ success: false, message: 'Gagal menyimpan kontak' });
            }
        });

        this.app.put('/api/contacts/:groupName', (req, res) => {
            try {
                const { groupName } = req.params;
                const { phoneNumbers } = req.body;
                
                if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
                    return res.status(400).json({ success: false, message: 'Minimal satu nomor telepon diperlukan' });
                }

                const contacts = loadContacts();
                if (!contacts.contactGroups[groupName]) {
                    return res.status(404).json({ success: false, message: 'Grup kontak tidak ditemukan' });
                }

                // Validate and format phone numbers
                const validNumbers = [];
                phoneNumbers.forEach(number => {
                    const cleanNumber = number.trim().replace(/\D/g, '');
                    if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
                        let formattedNumber = cleanNumber;
                        if (formattedNumber.startsWith('08')) {
                            formattedNumber = '62' + formattedNumber.substring(1);
                        } else if (formattedNumber.startsWith('8')) {
                            formattedNumber = '62' + formattedNumber;
                        } else if (!formattedNumber.startsWith('62')) {
                            formattedNumber = '62' + formattedNumber;
                        }
                        validNumbers.push(formattedNumber);
                    }
                });

                contacts.contactGroups[groupName].numbers = validNumbers;
                contacts.contactGroups[groupName].updatedAt = new Date().toISOString();

                saveContacts(contacts);

                res.json({ success: true, message: `Grup kontak "${groupName}" berhasil diperbarui` });
            } catch (error) {
                console.error('Error updating contacts:', error);
                res.status(500).json({ success: false, message: 'Gagal memperbarui kontak' });
            }
        });

        this.app.delete('/api/contacts/:groupName', (req, res) => {
            try {
                const { groupName } = req.params;
                
                const contacts = loadContacts();
                if (!contacts.contactGroups[groupName]) {
                    return res.status(404).json({ success: false, message: 'Grup kontak tidak ditemukan' });
                }

                delete contacts.contactGroups[groupName];
                saveContacts(contacts);

                res.json({ success: true, message: `Grup kontak "${groupName}" berhasil dihapus` });
            } catch (error) {
                console.error('Error deleting contacts:', error);
                res.status(500).json({ success: false, message: 'Gagal menghapus kontak' });
            }
        });

        this.app.listen(5000, '0.0.0.0', () => {
            console.log('Web interface tersedia di http://localhost:5000');
        });
    }

    async connectToWhatsApp() {
        const { state, saveCreds } = await useMultiFileAuthState('./sessions');
        
        this.sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            generateHighQualityLinkPreview: true
        });

        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                this.qrCode = qr;
                console.log('\n=== QR CODE TERSEDIA ===');
                console.log('Buka WhatsApp di ponsel Anda dan scan QR code di terminal atau web interface');
                console.log('Atau gunakan pairing code melalui web interface');
                console.log('Web interface: http://localhost:5000');
            }

            if (connection === 'close') {
                this.isConnected = false;
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Koneksi terputus karena ', lastDisconnect?.error, ', mencoba koneksi ulang ', shouldReconnect);
                
                if (shouldReconnect) {
                    setTimeout(() => {
                        this.connectToWhatsApp();
                    }, 3000);
                }
            } else if (connection === 'open') {
                this.isConnected = true;
                this.qrCode = null;
                this.pairingCode = null;
                this.pairingNumber = null;
                console.log('✅ WhatsApp Bot berhasil terkoneksi!');
                console.log('📱 Bot siap mengirim pesan reminder shift');
                
                // Initialize scheduler after connection
                initializeScheduler(this.sock, this.config);
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages (optional for bot commands)
        this.sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && message.message) {
                // Handle bot commands if needed
                await this.handleIncomingMessage(message);
            }
        });
    }

    async handleIncomingMessage(message) {
        try {
            const text = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || '';
            
            // Simple command handling
            if (text.toLowerCase().startsWith('!bot')) {
                const command = text.toLowerCase().replace('!bot', '').trim();
                
                switch (command) {
                    case 'status':
                        await this.sock.sendMessage(message.key.remoteJid, {
                            text: '🤖 Bot WhatsApp Shift Reminder aktif!\n' +
                                  `⏰ Shift dikonfigurasi untuk WIB timezone\n` +
                                  `📅 Mengirim reminder otomatis sesuai jadwal`
                        });
                        break;
                    case 'help':
                        await this.sock.sendMessage(message.key.remoteJid, {
                            text: '🆘 Perintah Bot:\n' +
                                  '• !bot status - Cek status bot\n' +
                                  '• !bot help - Tampilkan bantuan\n' +
                                  '• Konfigurasi jadwal melalui web interface'
                        });
                        break;
                }
            }
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    async start() {
        console.log('🚀 Memulai WhatsApp Bot Shift Reminder...');
        console.log('📊 Web interface akan tersedia di: http://localhost:5000');
        
        // Ensure directories exist
        const dirs = ['sessions', 'logs', 'config'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        await this.connectToWhatsApp();
    }
}

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Menghentikan bot...');
    process.exit(0);
});
