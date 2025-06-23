# Panduan Instalasi WhatsApp Bot di Termux

Bot WhatsApp ini bisa dijalankan di Termux (Android) dengan mudah.

## Persiapan Termux

### 1. Install Termux
- Download Termux dari F-Droid: https://f-droid.org/packages/com.termux/
- JANGAN install dari Google Play Store (versi lama)

### 2. Update Packages
```bash
pkg update && pkg upgrade
```

### 3. Install Node.js
```bash
pkg install nodejs npm git
```

### 4. Verifikasi Instalasi
```bash
node --version
npm --version
```

## Instalasi Bot

### 1. Download dan Extract
```bash
# Buat folder untuk bot
mkdir whatsapp-bot
cd whatsapp-bot

# Download file zip (transfer dari PC atau download langsung)
# Jika sudah ada file zip:
unzip whatsapp-bot-complete.zip
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Jalankan Bot
```bash
node index.js
```

## Akses Web Interface

### 1. Buka Browser di Android
- URL: `http://localhost:5000`
- Atau gunakan IP lokal: `http://127.0.0.1:5000`

### 2. Autentikasi WhatsApp
- Masukkan nomor WhatsApp Indonesia
- Klik "Minta Kode Pairing"
- Input kode 8 digit ke WhatsApp

## Tips Termux

### 1. Menjalankan di Background
```bash
# Install screen untuk background process
pkg install screen

# Jalankan dengan screen
screen -S whatsapp-bot
node index.js

# Detach: Tekan Ctrl+A lalu D
# Re-attach: screen -r whatsapp-bot
```

### 2. Auto-start saat Boot
```bash
# Install PM2
npm install -g pm2

# Jalankan dengan PM2
pm2 start index.js --name "whatsapp-bot"

# Save konfigurasi
pm2 save
pm2 startup
```

### 3. Storage Permission
```bash
# Berikan akses storage jika diperlukan
termux-setup-storage
```

## Troubleshooting Termux

### Error: "Permission denied"
```bash
chmod +x start.sh
```

### Error: "EACCES" saat npm install
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Error: "Network unreachable"
- Pastikan Termux punya akses internet
- Restart Termux dan coba lagi

### Bot tidak tersambung WhatsApp
- Pastikan WhatsApp Web tidak aktif di device lain
- Restart bot dan coba pairing ulang

## Kelebihan di Termux

- ✅ Berjalan 24/7 di ponsel Android
- ✅ Hemat listrik dibanding PC/Laptop
- ✅ Portable dan mudah dibawa
- ✅ Interface web tetap bisa diakses dari browser ponsel
- ✅ Tidak perlu PC/Server terpisah

## Kebutuhan Resource

- **RAM**: Minimal 2GB (recommended 4GB+)
- **Storage**: ~100MB untuk bot + dependencies
- **Internet**: Koneksi stabil untuk WhatsApp
- **Battery**: Optimasi agar tidak cepat habis

## Commands Termux Berguna

```bash
# Cek proses berjalan
ps aux | grep node

# Stop semua proses node
pkill node

# Cek penggunaan memory
free -h

# Cek storage
df -h

# Restart Termux session
exit
```

## File Penting

Setelah extract, struktur folder:
```
whatsapp-bot/
├── index.js              # File utama
├── package.json           # Dependencies
├── start.sh              # Launcher Linux/Termux
├── README.md             # Dokumentasi lengkap
├── TERMUX_INSTALL.md     # Panduan ini
├── config/               # Konfigurasi
├── web/                  # Interface web
└── utils/                # Helper functions
```

## Menjalankan Otomatis

### Script Auto-restart
```bash
#!/bin/bash
while true; do
    echo "Starting WhatsApp Bot..."
    node index.js
    echo "Bot stopped. Restarting in 5 seconds..."
    sleep 5
done
```

Simpan sebagai `auto-restart.sh`:
```bash
chmod +x auto-restart.sh
./auto-restart.sh
```

## Backup Data

### Backup Penting
```bash
# Backup konfigurasi dan session
cp -r config/ backup-config/
cp -r sessions/ backup-sessions/
```

### Restore
```bash
cp -r backup-config/* config/
cp -r backup-sessions/* sessions/
```

Bot siap digunakan di Termux dengan performa yang baik!