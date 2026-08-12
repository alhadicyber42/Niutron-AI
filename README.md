<div align="center">
  <img src="assets/Brahma_Lite_Logo.png" alt="Niutron AI" width="260" />

  <h1>🤖 Niutron AI</h1>

  <p><strong>Asisten AI Desktop Windows dengan VRM Avatar 3D</strong></p>
  <p>Voice-first automation · VRM Avatar Animation · Productivity workflows</p>

  <p>
    <a href="https://github.com/alhadicyber42/Niutron-AI"><img src="https://img.shields.io/badge/GitHub-Niutron--AI-blue?style=for-the-badge&logo=github" alt="GitHub" /></a>
    <a href="#getting-started"><img src="https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?style=for-the-badge&logo=windows" alt="Windows" /></a>
    <a href="#features"><img src="https://img.shields.io/badge/AI-Gemini%20%2B%20OpenRouter-4285F4?style=for-the-badge&logo=google" alt="AI Powered" /></a>
  </p>

  <p>
    <a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-Install%20%26%20Run-success?style=flat-square" alt="Quick Start" /></a>
    <a href="#vrm-avatar"><img src="https://img.shields.io/badge/VRM%20Avatar-3D%20Character-ff69b4?style=flat-square" alt="VRM Avatar" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-Custom-orange?style=flat-square" alt="License" /></a>
  </p>
</div>

---

## 🌟 Gambaran Umum

**Niutron AI** adalah asisten desktop Windows premium yang menggabungkan **kontrol suara natural**, **avatar VRM 3D yang hidup**, dan **alur kerja otomatis cerdas**. Dirancang untuk produktivitas tingkat lanjut dengan pengalaman visual yang immersive.

### ✨ Mengapa Niutron AI?

- 🎭 **VRM Avatar 3D** - Character avatar dengan animasi idle, talking, lip sync, dan auto-blink realistis
- 🎤 **Voice-First Interface** - Aktifkan dengan "Hey Niutron" atau "Halo Niutron"
- 🤖 **AI Powered** - Gemini 2.5 Flash + OpenRouter fallback untuk reliabilitas maksimal
- 🖥️ **Desktop Automation** - Kontrol aplikasi, browser, file, dan sistem Windows
- 📄 **Content Creation** - Generate presentasi, dokumen, PDF, dan website
- 🎨 **Modern UI** - Antarmuka Qt yang elegan dengan status real-time

---

## 🎭 VRM Avatar System

Niutron AI dilengkapi dengan sistem VRM Avatar 3D yang advanced:

### Features:
- ✅ **Upload & Manage VRM Models** - Ganti avatar sesuai keinginan
- ✅ **43+ VRMA Animations** - Idle dan talking animations yang natural
- ✅ **Auto Blink** - Sistem kedipan mata biomechanical realistic (2-8 detik)
- ✅ **Lip Sync** - Sinkronisasi mulut dengan suara menggunakan 5 viseme shapes
- ✅ **Micro Expressions** - Perubahan mood otomatis (neutral, happy, sad, thinking, bored, curious)
- ✅ **Smooth Transitions** - Fade in/out animations untuk transisi yang mulus
- ✅ **Background Transparent** - Avatar terintegrasi sempurna dengan UI

### Animation Library:
- 📁 **19 Idle Animations**: neutral, happy, sad, victory, defeat, gerah, meregangkan tangan, dll
- 📁 **24 Talking Animations**: talking, agreeing, arguing, gestures, pointing, shrugging, dll

---

## 🚀 Key Features

### 🎙️ Asisten Cerdas
- ✅ Penanganan perintah suara dan teks terpadu
- ✅ Wake-word detection: "niutron", "hey niutron", "halo niutron"
- ✅ Inspeksi layar untuk jawaban kontekstual
- ✅ Briefing otomatis dengan TTS
- ✅ Gemini AI dengan OpenRouter fallback

### ⚡ Produktivitas & Otomasi
- ✅ Kontrol aplikasi Windows, files, dan sistem
- ✅ Otomasi browser dengan Playwright
- ✅ Pengingat dan manajemen notifikasi
- ✅ Kontrol jarak jauh via Discord
- ✅ Niutron Connect untuk device pairing

### 📝 Content Creation
- ✅ Generate presentasi PowerPoint
- ✅ Buat dokumen Word dan spreadsheet
- ✅ Export PDF profesional
- ✅ Build website dan landing pages

### 🔌 Extensible
- ✅ Sistem plugin modular
- ✅ Architecture yang clean
- ✅ Konfigurasi file-based
- ✅ Mudah dikembangkan

---

## 📦 Quick Start

### Prasyarat

- **Windows 10/11** (64-bit)
- **Python 3.11** atau **3.12** (Python 3.14 belum support PyAudio)
- **Git** terinstal
- **Gemini API Key** (gratis di [Google AI Studio](https://makersuite.google.com/app/apikey))
- **OpenRouter API Key** (opsional, dari [OpenRouter.ai](https://openrouter.ai))

### 1️⃣ Clone Repository

```powershell
git clone https://github.com/alhadicyber42/Niutron-AI.git
cd Niutron-AI
```

### 2️⃣ Setup Virtual Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3️⃣ Install Dependencies

```powershell
pip install -r requirements.txt
playwright install
```

**Note:** PyAudio mungkin gagal install di Python 3.14. Gunakan Python 3.11 atau 3.12.

### 4️⃣ Konfigurasi API Keys

Buat file `config/api_keys.json`:

```json
{
  "gemini_api_key": "YOUR_GEMINI_API_KEY_HERE",
  "openrouter_api_key": "YOUR_OPENROUTER_API_KEY_HERE"
}
```

#### Mendapatkan Gemini API Key:
1. Buka [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Login dengan Google Account
3. Klik "Create API Key"
4. Copy dan paste ke `gemini_api_key`

#### Mendapatkan OpenRouter API Key (Opsional):
1. Register di [OpenRouter.ai](https://openrouter.ai)
2. Generate API key (format: `sk-or-...`)
3. Copy dan paste ke `openrouter_api_key`

### 5️⃣ Jalankan Niutron AI

```powershell
python main.py
```

Atau untuk startup yang lebih clean (tanpa console window):

```powershell
start_niutron.vbs
```

### 6️⃣ Upload VRM Model (Opsional)

1. Buka **Settings** → **AVATAR VRM**
2. Klik **Upload VRM**
3. Pilih file `.vrm` Anda
4. Model akan otomatis dimuat dengan animations

---

## ⚙️ Konfigurasi

### File Konfigurasi Utama:

| File | Deskripsi |
|------|-----------|
| `config/api_keys.json` | Kredensial Gemini dan OpenRouter |
| `config/app_settings.json` | Preferensi voice, UI, startup |
| `config/vrm_settings.json` | Konfigurasi VRM avatar |
| `config/brahma_connect.json` | Device pairing dan discovery |
| `config/discord_bot.json` | Discord bridge (opsional) |

### Customization Tips:

- **Voice Settings**: Atur volume, rate, dan voice di `app_settings.json`
- **VRM Avatar**: Upload model favorit melalui UI Settings
- **Wake Words**: Customize di source code `main.py`
- **Animations**: Tambahkan `.vrma` files ke `assets/vrm_animations/`

---

## 📁 Struktur Proyek

```
Niutron-AI/
├── assets/
│   ├── vrm_models/          # File VRM model (.vrm)
│   ├── vrm_viewer/          # VRM viewer HTML + animations
│   ├── vrm_animations/      # VRMA animation files
│   └── Brahma_Lite_Logo.png # Logo aplikasi
├── config/
│   ├── api_keys.json        # API credentials
│   ├── app_settings.json    # App configuration
│   └── vrm_settings.json    # VRM settings
├── actions/                 # Action modules (automation)
├── agent/                   # Agent logic (planner, executor)
├── core/                    # Core VRM integration
├── brahma_connect/          # Device gateway & pairing
├── plugins/                 # Plugin extensions
├── main.py                  # Entry point
├── ui.py                    # Qt UI & VRM background
├── or_client.py             # OpenRouter client
└── requirements.txt         # Python dependencies
```

---

## 🎨 VRM Avatar Details

### Supported Features:
- **VRM 0.0** and **VRM 1.0** formats
- **VRMA** animation files
- **Perfect Sync** (52 ARKit blendshapes) dan **Standard VRM** expressions
- **Three.js r167** + **Three-VRM v3.1.5**

### Animation System:

1. **Auto Blink**
   - Biomechanical timing (gamma distribution)
   - Partial blinks (15% chance)
   - Burst blinks (double/triple)
   - Speaking mode (longer intervals)

2. **Lip Sync**
   - 5 viseme shapes: `aa`, `ih`, `ou`, `ee`, `oh`
   - Cross-blending between visemes
   - Asymmetric smoothing (fast open, slow close)
   - Audio level responsive

3. **Idle Animations**
   - 19 VRMA files loaded from `assets/vrm_animations/idle animation/`
   - Random selection with 3-6 loop intervals
   - Smooth fade transitions (0.5-2.0 seconds)

4. **Talking Animations**
   - 24 VRMA files from `SELESAI` folders
   - Auto-play when AI speaks
   - Synchronized with lip sync
   - Auto-switch to next animation when finished

### Adding Custom Animations:

1. Export `.vrma` files from VRoid Studio or Blender
2. Place in `assets/vrm_animations/idle animation/` or create new folder
3. Update HTML viewer to load from new path
4. Restart application

---

## 🔌 Plugin System

Extend Niutron dengan custom plugins Python.

### Plugin Hooks:

```python
# plugins/my_plugin.py

def on_brahma_created(brahma):
    """Called when assistant instance is initialized"""
    print("Niutron AI initialized!")

def on_startup(brahma):
    """Called after startup when plugins are registered"""
    print("Plugin loaded!")

def on_text_command(text, source, brahma=None):
    """Called for every incoming text command"""
    if "hello plugin" in text.lower():
        print("Plugin command received!")
        return True  # Indicates command was handled
    return False
```

Simpan plugin di folder `plugins/` dan restart aplikasi.

---

## 🛠️ Development

### Running Tests:

```powershell
pytest tests/
```

### Code Style:

```powershell
black .
flake8 .
```

### Building Executable:

```powershell
pyinstaller --onefile --windowed main.py
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 Known Issues

- ❌ **PyAudio**: Gagal install di Python 3.14 (use Python 3.11/3.12)
- ⚠️ **VRM Loading**: First load mungkin lambat karena download CDN
- ⚠️ **Animations**: File VRMA besar dapat memperlambat startup

---

## 🗺️ Roadmap

- [ ] Multi-language support (English, Japanese)
- [ ] Cloud sync untuk VRM models dan settings
- [ ] Real-time voice recognition dengan Whisper
- [ ] Mobile companion app
- [ ] Gesture recognition untuk VRM
- [ ] Export conversation history
- [ ] Plugin marketplace

---

## 📜 License

This project is licensed under a custom source-available license. See [LICENSE](LICENSE) for details.

**Attribution Required:** Please keep attribution when building upon Niutron AI.

---

## 👨‍💻 Author

**alhadicyber42**
- GitHub: [@alhadicyber42](https://github.com/alhadicyber42)
- Repository: [Niutron-AI](https://github.com/alhadicyber42/Niutron-AI)

---

## 🙏 Acknowledgments

- Original concept inspired by Brahma Echo
- VRM Avatar system powered by [Three-VRM](https://github.com/pixiv/three-vrm)
- Animation library curated from various sources
- UI built with PyQt6
- AI powered by Google Gemini and OpenRouter

---

## 🌐 Community

- **Issues**: [GitHub Issues](https://github.com/alhadicyber42/Niutron-AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alhadicyber42/Niutron-AI/discussions)

---

<div align="center">
  <p><strong>Made with ❤️ by alhadicyber42</strong></p>
  <p>⭐ Star this repo if you find it useful!</p>
</div>
