# 🚀 Quick Start: VRM Avatar di Niutron

Panduan cepat untuk menambahkan VRM Avatar ke Niutron dalam 5 menit!

## ⚡ Langkah Cepat

### 1. Install QtWebEngine

```powershell
# Aktifkan venv
.\.venv\Scripts\Activate.ps1

# Install QtWebEngine
pip install PyQt6-WebEngine
```

### 2. Download Model VRM Gratis

**Opsi A: Download Langsung**
- Kunjungi: https://hub.vroid.com/en/characters/7307666808713466197/models/1562872784723548339
- Klik "Download"
- Simpan sebagai `assets/vrm_models/default.vrm`

**Opsi B: Buat Sendiri (15 menit)**
- Download VRoid Studio: https://vroid.com/studio
- Buat karakter
- Export sebagai VRM
- Simpan di `assets/vrm_models/`

### 3. Test Avatar

```powershell
# Test standalone
python -c "
from core.vrm_avatar import VRMAvatar
from PyQt6.QtWidgets import QApplication
import sys

app = QApplication(sys.argv)
avatar = VRMAvatar()
avatar.resize(600, 800)
avatar.show()
avatar.load_vrm('assets/vrm_models/default.vrm')
sys.exit(app.exec())
"
```

### 4. Integrasi ke UI

Edit `ui.py`, tambahkan di class `BrahmaUI.__init__`:

```python
# Di bagian import (line ~50)
from core.vrm_integration import create_vrm_avatar_dock

# Di __init__ method setelah self._win dibuat (line ~9900)
# Tambahkan VRM Avatar Panel
self._vrm_panel = create_vrm_avatar_dock(self._win)

# Simpan reference
self._win._vrm_panel = self._vrm_panel
```

### 5. Connect dengan Speech

Edit `main.py`, di class Niutron:

```python
# Di method speak() atau _speak_text()
def speak(self, text: str):
    # Detect mood dan set expression
    if hasattr(self.ui, '_vrm_panel'):
        self.ui._vrm_panel.set_expression_from_text(text)
        self.ui._vrm_panel.start_speaking()
    
    # ... existing TTS code ...
    
    # Stop speaking animation
    if hasattr(self.ui, '_vrm_panel'):
        self.ui._vrm_panel.stop_speaking()
```

### 6. Run Niutron!

```powershell
python main.py
```

## 🎨 Test Commands

Setelah Niutron berjalan dengan VRM avatar, test dengan:

1. **"Halo Niutron"** - Avatar akan tersenyum (happy)
2. **"Kamu hebat!"** - Expression happy
3. **"Saya sedih"** - Expression sad
4. **"Wow amazing!"** - Expression surprised

## 🎯 Posisi VRM Panel di UI

VRM panel bisa ditempatkan di:

**Opsi 1: Right Panel (Next to chat)**
```python
# Edit ui.py
right_layout.addWidget(self._vrm_panel)
```

**Opsi 2: Floating Window**
```python
self._vrm_panel.setWindowFlags(Qt.WindowType.Window)
self._vrm_panel.show()
```

**Opsi 3: Tab baru**
```python
self._tabs.addTab(self._vrm_panel, "🎭 Avatar")
```

## 🔧 Customization Cepat

### Ubah Warna Accent

Edit `assets/vrm_viewer/index.html`:

```javascript
// Line ~80 - Rim light color
const rimLight = new THREE.DirectionalLight(0xff6b9d, 0.3); // Pink
// atau
const rimLight = new THREE.DirectionalLight(0x00d9ff, 0.3); // Cyan
```

### Ubah Camera Angle

```javascript
// Line ~60
camera.position.set(0.3, 1.4, 2.0); // Slight right angle
// atau
camera.position.set(0, 1.5, 1.5);   // Closer zoom
```

### Tambah Expression Buttons

Edit `core/vrm_integration.py`:

```python
# Di method _init_ui, tambah button baru
custom_btn = QPushButton("😎 Cool")
custom_btn.clicked.connect(lambda: self._set_mood("relaxed"))
mood_layout.addWidget(custom_btn)
```

## 📋 Checklist

- [ ] QtWebEngine installed
- [ ] Model VRM downloaded ke `assets/vrm_models/`
- [ ] Test avatar standalone (berjalan OK)
- [ ] VRM panel ditambahkan ke UI
- [ ] Connected ke speech system
- [ ] Test dengan voice commands
- [ ] Sesuaikan posisi/ukuran panel
- [ ] Customize expressions sesuai keinginan

## ⚠️ Troubleshooting Cepat

### "No module named 'PyQt6.QtWebEngineWidgets'"
```bash
pip install PyQt6-WebEngine
```

### Avatar hitam/tidak terlihat
- Cek lighting di `index.html`
- Increase ambient light intensity:
  ```javascript
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  ```

### Model tidak load
- Pastikan path benar
- Cek ekstensi file (harus `.vrm`)
- Coba model lain dari VRoid Hub

### Ekspresi tidak berubah
- Model mungkin tidak punya blend shapes
- Download model dari VRoid Hub (bukan custom)
- Test dengan model sample

## 🎁 Model VRM Gratis Recommended

1. **VRoid Sample Models**
   - https://hub.vroid.com/en/characters/7307666808713466197

2. **Anime Style**
   - https://hub.vroid.com/en/models?characterization=anime

3. **Realistic Style**
   - https://hub.vroid.com/en/models?characterization=realistic

## 📚 Docs Lengkap

Untuk panduan detail, baca:
- `docs/VRM_INTEGRATION.md` - API reference lengkap
- `docs/VRM_SETUP_SUMMARY.md` - Summary setup
- `assets/vrm_models/README.md` - Info models
- `assets/vrm_animations/README.md` - Info animations

## 🎉 Done!

Avatar VRM Anda sekarang siap di Niutron!

**Next Steps:**
- Tambah custom expressions
- Download animasi VRMA
- Fine-tune camera angles
- Connect dengan gesture recognition
- Add voice activity visualization

---

**Tips:** Untuk performa terbaik, gunakan model VRM dengan:
- Poly count < 30,000
- Texture 2048x2048
- Standard VRM expressions

Selamat berkreasi dengan Niutron VRM Avatar! 🎭✨
