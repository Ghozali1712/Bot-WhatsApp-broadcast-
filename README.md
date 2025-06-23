# WhatsApp Bot Shift Reminder

Bot WhatsApp otomatis untuk mengirim reminder shift kerja dengan interface web untuk manajemen.

## Fitur Utama

- ✅ Reminder otomatis shift 1, 2, dan 3 sesuai jadwal
- ✅ Interface web untuk konfigurasi dan monitoring
- ✅ Autentikasi menggunakan pairing code (nomor telepon)
- ✅ Broadcast message ke grup atau nomor individu
- ✅ Manajemen grup kontak dengan nama
- ✅ Format pesan dalam bahasa Indonesia
- ✅ Timezone Indonesia (WIB)

## Persyaratan Sistem

- Node.js 18 atau lebih baru
- NPM (Node Package Manager)
- Koneksi internet yang stabil
- Nomor WhatsApp yang belum terdaftar WhatsApp Web/Business

## Instalasi

1. **Extract file zip** ke folder yang diinginkan

2. **Install dependencies**
```bash
npm install
```

3. **Jalankan bot**
```bash
npm start
```
atau
```bash
node index.js
```

## Cara Penggunaan

### 1. Menjalankan Bot

```bash
node index.js
```

Bot akan menampilkan:
- URL web interface: `http://localhost:5000`
- Status koneksi WhatsApp

### 2. Autentikasi WhatsApp

1. Buka web interface di browser: `http://localhost:5000`
2. Masukkan nomor WhatsApp Indonesia (contoh: 081234567890)
3. Klik "Minta Kode Pairing"
4. Masukkan kode 8 digit yang muncul ke WhatsApp di ponsel
5. Bot akan otomatis tersambung

### 3. Konfigurasi Shift

**Default Schedule:**
- **Shift 1**: Setiap jam mulai 07:00 WIB
- **Shift 2**: Harian pada 14:30 WIB  
- **Shift 3**: Harian pada 22:30 WIB

**Mengubah Jadwal:**
1. Buka tab "Konfigurasi Shift"
2. Edit waktu sesuai kebutuhan
3. Klik "Simpan Konfigurasi"

### 4. Mengelola Grup WhatsApp

1. Buka tab "Kelola Grup"
2. Tambahkan bot ke grup WhatsApp yang diinginkan
3. ID grup akan muncul otomatis
4. Aktifkan grup untuk menerima reminder

### 5. Broadcast Message

**Kirim ke Grup:**
1. Buka tab "Broadcast Message"
2. Pilih "Kirim ke Grup"
3. Centang grup yang dituju
4. Tulis pesan dan kirim

**Kirim ke Nomor:**
1. Pilih "Kirim ke Nomor"
2. Pilih grup kontak yang sudah disimpan atau input manual
3. Tulis pesan dan kirim

### 6. Manajemen Kontak

1. Buka tab "Kelola Kontak"
2. Buat grup kontak baru dengan nama (contoh: "Tim Marketing")
3. Masukkan nomor WhatsApp (satu per baris)
4. Simpan untuk digunakan di broadcast

## Struktur File

```
whatsapp-bot/
├── index.js              # File utama bot
├── package.json           # Dependencies
├── config/               # Folder konfigurasi
│   ├── config.json       # Pengaturan shift
│   ├── groups.json       # Data grup WhatsApp
│   ├── contacts.json     # Grup kontak tersimpan
│   └── schedules.json    # Statistik jadwal
├── sessions/             # Session WhatsApp (otomatis)
├── logs/                 # Log pesan (otomatis)
├── utils/                # Utility functions
│   ├── configManager.js  # Manajemen konfigurasi
│   ├── messageHandler.js # Handler pesan
│   └── scheduler.js      # Scheduler reminder
└── web/                  # Interface web
    ├── index.html        # Halaman utama
    ├── app.js           # JavaScript frontend
    └── style.css        # Styling
```

## Konfigurasi Pesan

Edit file `config/config.json` untuk mengubah template pesan:

```json
{
  "timezone": "Asia/Jakarta",
  "shifts": {
    "shift1": {
      "name": "Shift 1 - Hourly (Mulai 07:00)",
      "time": "hourly",
      "startTime": "07:00",
      "enabled": true,
      "message": "🌅 **REMINDER SHIFT 1 - JAM {currentTime}**\n\nWaktu untuk melakukan checklist store activity shift 1!\n\n⏰ Reminder pengingat akan di kirimkan setiap 1 jam sekali mulai 07:00 WIB\n📅 Tanggal: {date}\n\n*Semangat bekerja! 💪*"
    }
  }
}
```

## Troubleshooting

### Bot Tidak Tersambung
1. Pastikan nomor WhatsApp belum terdaftar WhatsApp Web/Business
2. Cek koneksi internet
3. Restart bot dan coba lagi

### Pesan Tidak Terkirim
1. Pastikan bot sudah ditambahkan ke grup
2. Cek apakah bot masih tersambung di web interface
3. Lihat log error di console

### Web Interface Tidak Bisa Diakses
1. Pastikan port 5000 tidak digunakan aplikasi lain
2. Cek firewall/antivirus
3. Coba akses `http://127.0.0.1:5000`

### Session Bermasalah
1. Hapus folder `sessions/`
2. Restart bot
3. Lakukan pairing ulang

## Deployment ke Server

### Menggunakan PM2 (Recommended)

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Jalankan dengan PM2**
```bash
pm2 start index.js --name "whatsapp-bot"
```

3. **Auto-start saat boot**
```bash
pm2 startup
pm2 save
```

### Menggunakan Screen (Linux)

```bash
screen -S whatsapp-bot
node index.js
# Tekan Ctrl+A+D untuk detach
```

## Tips Penggunaan

1. **Backup Berkala**: Backup folder `config/` dan `sessions/`
2. **Monitor Log**: Periksa console log untuk error
3. **Update Berkala**: Update dependencies secara berkala
4. **Keamanan**: Jangan share file session ke orang lain
5. **Bandwidth**: Bot menggunakan bandwidth minimal untuk operasi normal

## Support

Jika mengalami masalah:
1. Cek log error di console
2. Restart bot
3. Periksa koneksi internet dan WhatsApp

## Lisensi

Dibuat untuk keperluan internal. Gunakan dengan bijak sesuai kebijakan WhatsApp.

---

**Terakhir diupdate:** Desember 2024
**Versi:** 1.0.0