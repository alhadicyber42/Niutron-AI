# 📦 VRM Model Management

Panduan lengkap untuk mengelola VRM models di Niutron - Upload, Pilih, dan Hapus model avatar.

## 🎯 Fitur

### ✅ Upload VRM Models
- Upload file .vrm dari komputer Anda
- Copy otomatis ke folder `assets/vrm_models/`
- Auto-load setelah upload
- Deteksi duplikat dengan konfirmasi overwrite

### ✅ Model Selector
- Dropdown list semua model yang tersedia
- Show ukuran file tiap model
- Auto-select last active model saat startup
- Instant switch antar models

### ✅ Delete Models
- Hapus model yang tidak digunakan
- Konfirmasi sebelum delete
- Safe delete (hanya file di folder models)

### ✅ Persistent Storage
- Simpan pilihan model aktif
- Auto-load model terakhir saat startup
- Config file: `config/vrm_settings.json`

## 🚀 Cara Menggunakan

### Upload Model VRM Baru

#### Method 1: Via UI Panel
1. Klik tombol **📤 Upload VRM** di VRM panel
2. Browse dan pilih file .vrm dari komputer
3. Model akan otomatis diupload dan dimuat
4. Selesai! Avatar langsung berubah

#### Method 2: Manual Copy
1. Copy file .vrm ke folder `assets/vrm_models/`
2. Klik tombol **🔄** (Refresh) di VRM panel
3. Pilih model dari dropdown

### Memilih Model

1. Lihat dropdown **📦 Model VRM**
2. Semua model ditampilkan dengan format: `nama_model (size MB)`
3. Klik model yang diinginkan
4. Avatar akan langsung berganti

**Contoh:**
```
📦 Model VRM:
  ▼ my_avatar (12.3 MB)
    character_01 (8.5 MB)
    cute_girl (15.2 MB)
    robot (6.1 MB)
```

### Menghapus Model

1. Pilih model yang ingin dihapus dari dropdown
2. Klik tombol **🗑️** (Delete)
3. Konfirmasi penghapusan
4. Model akan dihapus permanen

**⚠️ Warning:** File akan dihapus permanen. Tidak bisa di-undo!

### Refresh Daftar Model

Jika Anda menambah/menghapus model secara manual, klik tombol **🔄** untuk refresh daftar.

## 📁 Struktur File

```
Brahma-Echo/
├── assets/
│   └── vrm_models/              # Semua VRM models disimpan di sini
│       ├── avatar_01.vrm
│       ├── character_cute.vrm
│       └── robot_v2.vrm
├── config/
│   └── vrm_settings.json        # Config: active model, preferences
```

### Config File Format

```json
{
  "active_model": "d:\\...\\assets\\vrm_models\\avatar_01.vrm",
  "last_expression": "neutral"
}
```

## 🎨 UI Components

### Model Selector Section

```
┌─────────────────────────────────────┐
│ 📦 Model VRM:                       │
│ ┌─────────────────────────────────┐ │
│ │ avatar_01 (12.3 MB)        ▼   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌────────────┐ ┌──┐ ┌──┐          │
│ │📤 Upload   │ │🔄│ │🗑│          │
│ │   VRM      │ │  │ │ │          │
│ └────────────┘ └──┘ └──┘          │
└─────────────────────────────────────┘

Buttons:
- 📤 Upload VRM: Upload model baru
- 🔄: Refresh daftar model
- 🗑️: Hapus model yang dipilih
```

## 💻 API Usage

### Dari Python Code

```python
# Get VRM panel
vrm_panel = ui._vrm_panel

# Get current model path
current_model = vrm_panel.get_current_model_path()
print(f"Current model: {current_model}")

# Refresh model list
vrm_panel._refresh_model_list()

# Get available models
from core.vrm_integration import get_available_vrm_models
models = get_available_vrm_models()
for model in models:
    print(f"{model['name']}: {model['size']} bytes")

# Load specific model
if vrm_panel.avatar:
    vrm_panel.avatar.load_vrm("path/to/model.vrm")

# Listen to model changes
vrm_panel.model_changed.connect(lambda path: print(f"Model changed: {path}"))
```

### Configuration Functions

```python
from core.vrm_integration import (
    load_vrm_config,
    save_vrm_config,
    get_available_vrm_models,
    VRM_MODELS_DIR,
    VRM_CONFIG_FILE
)

# Load config
config = load_vrm_config()
print(f"Active model: {config.get('active_model')}")

# Save config
config["active_model"] = "path/to/new/model.vrm"
save_vrm_config(config)

# Get models directory
print(f"Models folder: {VRM_MODELS_DIR}")

# List all models
models = get_available_vrm_models()
```

## 🔄 Workflow

### Startup Flow

```
Application Start
     ↓
Load vrm_settings.json
     ↓
Check "active_model"
     ↓
Active model exists? 
     ├─ YES → Load active model
     └─ NO  → Load first available model
           ↓
     Update dropdown selection
           ↓
     Avatar ready!
```

### Upload Flow

```
User clicks Upload VRM
     ↓
Open file dialog
     ↓
User selects .vrm file
     ↓
Check if file exists in models folder
     ├─ YES → Ask overwrite confirmation
     └─ NO  → Continue
           ↓
     Copy file to assets/vrm_models/
           ↓
     Refresh model list
           ↓
     Auto-select uploaded model
           ↓
     Load model to avatar
           ↓
     Save to config as active_model
           ↓
     Show success message
```

### Model Switch Flow

```
User selects model from dropdown
     ↓
Get model path from dropdown data
     ↓
Validate file exists
     ↓
Load VRM model to avatar
     ↓
Save as active_model in config
     ↓
Emit model_changed signal
     ↓
Avatar updates
```

## 🎯 Best Practices

### Model Organization

**Recommended naming:**
```
✅ Good:
  - character_female_01.vrm
  - robot_mecha_v2.vrm
  - avatar_casual.vrm

❌ Bad:
  - model.vrm (too generic)
  - 123.vrm (no description)
  - my model final final v2.vrm (spaces, too long)
```

**Keep models organized:**
- Use descriptive names
- Include version numbers if needed
- Keep file size reasonable (<20 MB recommended)

### Model Size

**Recommendations:**
- **Small:** 5-10 MB (optimized for performance)
- **Medium:** 10-15 MB (good balance)
- **Large:** 15-25 MB (high quality, may impact performance)

**Too large?** Consider:
- Reduce texture resolution
- Remove unused blend shapes
- Optimize mesh poly count

### Storage Management

Monitor your models folder:
```powershell
# Check folder size
Get-ChildItem "assets\vrm_models" | Measure-Object -Property Length -Sum

# List all models with size
Get-ChildItem "assets\vrm_models\*.vrm" | Select-Object Name, @{N="Size(MB)";E={[math]::Round($_.Length/1MB,2)}}
```

## 🔧 Troubleshooting

### Model tidak muncul di dropdown

**Penyebab:**
- File bukan ekstensi .vrm
- File di folder yang salah
- Dropdown perlu refresh

**Solusi:**
1. Check file ada di `assets/vrm_models/`
2. Check ekstensi file: `.vrm` (lowercase)
3. Klik tombol 🔄 untuk refresh

### Upload gagal

**Penyebab:**
- Disk penuh
- Permission denied
- File corrupt

**Solusi:**
1. Check space tersedia
2. Run as administrator
3. Test dengan model lain

### Model tidak load setelah dipilih

**Penyebab:**
- File corrupt
- WebEngine tidak tersedia
- Model format tidak support

**Solusi:**
1. Check console untuk error
2. Test dengan model dari VRoid Hub
3. Verify QtWebEngine installed

### Config tidak tersimpan

**Penyebab:**
- Permission denied
- Config folder tidak ada

**Solusi:**
1. Create `config/` folder manually
2. Check write permissions
3. Check console log untuk error

## 📊 Signals & Events

### model_changed Signal

Emitted saat user ganti model:

```python
def on_model_changed(model_path: str):
    print(f"New model loaded: {model_path}")
    # Do something with new model

vrm_panel.model_changed.connect(on_model_changed)
```

### expression_changed Signal

```python
vrm_panel.expression_changed.connect(
    lambda expr, intensity: print(f"Expression: {expr} ({intensity})")
)
```

### mood_changed Signal

```python
vrm_panel.mood_changed.connect(
    lambda mood: print(f"Mood: {mood}")
)
```

## 🎨 Customization

### Change Models Folder

Edit `core/vrm_integration.py`:

```python
VRM_MODELS_DIR = BASE_DIR / "my_custom_folder" / "vrm_models"
```

### Change Config Location

```python
VRM_CONFIG_FILE = BASE_DIR / "config" / "my_vrm_config.json"
```

### Add Custom Metadata

Extend `get_available_vrm_models()`:

```python
def get_available_vrm_models():
    models = []
    for vrm_file in VRM_MODELS_DIR.glob("*.vrm"):
        models.append({
            "name": vrm_file.stem,
            "path": str(vrm_file),
            "size": vrm_file.stat().st_size,
            "modified": vrm_file.stat().st_mtime,  # Add timestamp
            "author": "Unknown",  # Add metadata
        })
    return models
```

## 📝 Example Usage

### Load Multiple Models Programmatically

```python
from core.vrm_integration import get_available_vrm_models

models = get_available_vrm_models()

for i, model in enumerate(models):
    print(f"{i+1}. {model['name']} - {model['size']/1024/1024:.1f} MB")
    
# Load specific model by index
if models:
    vrm_panel.avatar.load_vrm(models[0]["path"])
```

### Auto-switch Models on Timer

```python
from PyQt6.QtCore import QTimer

def rotate_models():
    models = get_available_vrm_models()
    if not models:
        return
    
    current_idx = 0
    
    def switch_model():
        nonlocal current_idx
        model = models[current_idx]
        vrm_panel.avatar.load_vrm(model["path"])
        current_idx = (current_idx + 1) % len(models)
    
    timer = QTimer()
    timer.timeout.connect(switch_model)
    timer.start(30000)  # Switch every 30 seconds
    
rotate_models()
```

### Batch Upload

```python
from pathlib import Path
import shutil

def batch_upload_vrms(folder_path):
    """Upload all .vrm files from a folder"""
    source_folder = Path(folder_path)
    
    vrm_files = list(source_folder.glob("*.vrm"))
    print(f"Found {len(vrm_files)} VRM files")
    
    for vrm_file in vrm_files:
        dest = VRM_MODELS_DIR / vrm_file.name
        if not dest.exists():
            shutil.copy2(vrm_file, dest)
            print(f"Uploaded: {vrm_file.name}")
    
    # Refresh UI
    vrm_panel._refresh_model_list()

# Usage
batch_upload_vrms("D:/MyVRMCollection")
```

## 🎉 Summary

VRM Model Management menyediakan:

✅ **Upload** - Tambah model baru dengan mudah  
✅ **Select** - Pilih model dari dropdown  
✅ **Delete** - Hapus model yang tidak digunakan  
✅ **Auto-load** - Load last active model otomatis  
✅ **Persistent** - Config tersimpan antar session  
✅ **User-friendly** - UI intuitif dengan tooltips  
✅ **Safe** - Konfirmasi untuk operasi destructive  
✅ **Extensible** - API untuk custom workflows  

**Next:** Upload model favorit Anda dan mulai berkreasi! 🎭✨

---

**Created**: 2025  
**Framework**: PyQt6  
**Storage**: Local file system + JSON config  
**License**: Sesuai Niutron license  
