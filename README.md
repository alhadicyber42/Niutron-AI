<div align="center">
  <img src="assets/Brahma_Lite_Logo.png" alt="Niutron" width="260" />

  <h1>Niutron</h1>

  <p><strong>Asisten AI Desktop Windows Open-Source</strong></p>
  <p>Voice-first automation · contextual desktop intelligence · productivity workflows</p>

  <p>
    <a href="#overview"><img src="https://img.shields.io/badge/experience-open%20source-blue?style=for-the-badge" alt="Open Source" /></a>
    <a href="#getting-started"><img src="https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey?style=for-the-badge" alt="Windows" /></a>
    <a href="#features"><img src="https://img.shields.io/badge/tech-Gemini%20%2B%20OpenRouter-green?style=for-the-badge" alt="Gemini + OpenRouter" /></a>
  </p>

  <p>
    <a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-Install%20%26%20Run-success?style=flat-square" alt="Quick Start" /></a>
    <a href="#project-structure"><img src="https://img.shields.io/badge/Project%20Structure-Clean%20Architecture-lightgrey?style=flat-square" alt="Project Structure" /></a>
    <a href="#community"><img src="https://img.shields.io/badge/Community-Discord-purple?style=flat-square" alt="Community" /></a>
  </p>
</div>

---

## Gambaran Umum

Niutron adalah asisten desktop Windows premium yang menggabungkan kontrol suara dan teks dengan alur kerja otomatis, kecerdasan layar, dan pembuatan konten yang kaya.

Dirancang untuk produktivitas desktop tingkat lanjut, Niutron memberikan:

- Perintah voice-first dan otomasi desktop
- Kontrol aplikasi, alur kerja browser, dan penanganan file
- Inspeksi layar kontekstual dan eksekusi tugas adaptif
- Pembuatan presentasi, dokumen, dan laporan
- Kontrol jarak jauh via Discord dan Niutron Connect

## Highlight Cepat

| Kemampuan inti | Mengapa penting |
|---|---|
| Asisten voice-first | Ucapkan perintah secara alami dan tetap hands-free |
| Gemini + OpenRouter | Respons cepat dengan dukungan fallback yang tangguh |
| Konteks sadar layar | Tanya tentang window yang terlihat dan konten di layar |
| Otomasi dokumen | Buat presentasi, dokumen, spreadsheet, dan PDF |
| Siap plugin | Perluas fitur dengan plugin Python ringan |

## Key Benefits

- Wake-word support for “Brahma Echo” and responsive assistant activation
- Gemini 2.5 Flash-powered AI with OpenRouter fallback resilience
- Polished Qt interface with live status displays and workflow cards
- Modular action architecture for clean extensibility and automation
- Secure local configuration with file-based credential storage
- Device pairing and remote routing through Brahma Connect

## Fitur

### Asisten Cerdas

- Penanganan perintah suara dan ketikan terpadu
- Mendengarkan wake-word dan aktivasi asisten yang responsif
- Inspeksi layar dinamis untuk jawaban yang sadar konteks
- Briefing otomatis dengan pemutaran Edge TTS
- AI Gemini-first dengan ketahanan fallback OpenRouter

### Produktivitas & Otomasi

- Kontrol buka dan aplikasi Windows, windows, file, dan aksi sistem
- Otomasi browser dengan alur kerja yang digerakkan Playwright
- Otomasi kontekstual berdasarkan konten layar dan notifikasi
- Pengingat, bantuan rapat, dan manajemen notifikasi

### Alat Konten & Office

- Hasilkan deck presentasi, ringkasan, dan konten slide
- Buat dokumen Word dan spreadsheet dari prompt
- Ekspor laporan dan deliverable yang dipoles sebagai PDF
- Bangun halaman landing dan workspace situs web secara lokal

### Integrasi

- Discord bridge untuk perintah jarak jauh dan kolaborasi
- OpenRouter fallback untuk akses AI tanpa gangguan
- Pengaturan suara, UI, startup, dan notifikasi yang dapat dikonfigurasi
- Niutron Connect untuk penemuan perangkat dan perutean perintah

## Memulai

### Prasyarat

- Windows 10 atau Windows 11
- Python 3.11 atau Python 3.12
- Git terinstal
- Gemini API key
- OpenRouter API key (opsional tapi direkomendasikan)

### 1. Clone repository

```powershell
git clone https://github.com/yourusername/niutron.git
cd niutron
```

### 2. Buat dan aktifkan virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Instal dependencies

```powershell
pip install -r requirements.txt
playwright install
```

### 4. Konfigurasi kredensial API

Buat `config/api_keys.json` dengan kunci Anda:

```json
{
  "gemini_api_key": "YOUR_GEMINI_API_KEY",
  "openrouter_api_key": "YOUR_OPENROUTER_API_KEY"
}
```

#### Gemini API Key

1. Create a Google Cloud or Gemini account.
2. Enable Gemini API access for your project.
3. Add the generated key to `gemini_api_key`.

#### OpenRouter API Key

1. Register at https://openrouter.ai.
2. Generate an `sk-or-` API key.
3. Add the key to `openrouter_api_key`.

### 5. Opsional: Konfigurasi integrasi Discord

Jika Anda menginginkan kontrol jarak jauh Discord, isi `config/discord_bot.json` dengan kredensial bot dan pengaturan koneksi Anda.

### 6. Jalankan Niutron

```powershell
python main.py
```

Untuk pengalaman startup yang lebih bersih di Windows:

```powershell
start_niutron.vbs
```

## Konfigurasi

File konfigurasi inti:

- `config/api_keys.json` — Kredensial Gemini dan OpenRouter
- `config/app_settings.json` — preferensi suara, UI, startup, dan otomasi
- `config/brahma_connect.json` — pemasangan perangkat, gateway, dan pengaturan penemuan
- `config/discord_bot.json` — konfigurasi bridge Discord

## Struktur Proyek

- `main.py` — startup aplikasi, orkestrasi AI, dan routing perintah
- `ui.py` — antarmuka desktop berbasis Qt dan kontrol asisten langsung
- `actions/` — otomasi modular, dokumen, dan alat asisten
- `brahma_connect/` — gateway lokal, pemasangan, dan routing jarak jauh
- `config/` — pengaturan lokal, kredensial, dan konfigurasi runtime
- `plugins/` — ekstensi plugin opsional
- `tests/` — tes integrasi dan validasi

## Sistem Plugin

Perluas Niutron dengan plugin Python kustom dengan menambahkan file ke `plugins/`.

Hook yang didukung:

- `on_brahma_created(brahma)` — dipanggil saat instance asisten diinisialisasi
- `on_startup(brahma)` — dipanggil setelah startup saat plugin terdaftar
- `on_text_command(text, source, brahma=None)` — dipanggil untuk setiap perintah teks yang masuk; kembalikan `True` untuk menunjukkan perintah telah ditangani

## Praktik Terbaik

- Simpan kredensial di `config/api_keys.json` dan hindari commit secrets.
- Gunakan virtual environment untuk semua sesi development dan runtime.
- Restart aplikasi setelah mengubah config atau menambah plugin.
- Tinjau `config/app_settings.json` untuk menyetel perilaku suara, UI, dan otomasi.

## Komunitas & Dukungan

- Discord: https://discord.gg/gEYmJKKtq3

## Lisensi

Proyek ini diterbitkan di bawah lisensi source-available kustom. Lihat `LICENSE` untuk detail.

## Pembuat

- Modified by: Your Name

> Pertahankan atribusi dan jaga keamanan kredensial saat membangun di atas Niutron.
