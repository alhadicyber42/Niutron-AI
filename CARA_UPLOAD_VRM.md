# 📤 Cara Upload dan Kelola Model VRM

## Lokasi Tombol Upload VRM

Tombol upload VRM ada di **System Settings** → **Right Sidebar** → **Section "AVATAR VRM"**

### 🎯 Langkah-langkah Lengkap:

```
1. Buka aplikasi Niutron
2. Klik icon ⚙️ (Settings) di SIDEBAR KIRI
3. Lihat ke SIDEBAR KANAN (bukan area tengah!)
4. Scroll ke bawah di sidebar kanan
5. Temukan section "AVATAR VRM"
6. Klik tombol "📤 Upload"
```

## 🖼️ Visual Guide

### Layout Halaman Settings:

```
┌─────────────────────────────────────────────────────────┐
│  LEFT SIDEBAR  │     MAIN CONTENT      │  RIGHT SIDEBAR │
│  (Navigation)  │   (Settings Page)     │  (VRM Upload)  │
├────────────────┼───────────────────────┼────────────────┤
│                │                       │                │
│   🏠 Home      │  SYSTEM & CONNECTIVITY│  SYSTEM STATUS │
│   📱 Devices   │                       │  ● System...   │
│ ► ⚙️ Settings  │  [Gemini Settings]    │                │
│                │  [OpenRouter Settings]│  QUICK ACTIONS │
│                │  [Discord Settings]   │  ↻ Restart...  │
│                │  [App Preferences]    │  ⟳ Reload...   │
│                │                       │  📁 Open Data  │
│                │                       │  📄 View Logs  │
│                │                       │  ⬇ Check Upd.  │
│                │                       │                │
│                │                       │ ⬇ SCROLL DOWN  │
│                │                       │                │
│                │                       │  AVATAR VRM ⬅━ │
│                │                       │ ┌────────────┐ │
│                │                       │ │📦 Model VRM│ │
│                │                       │ │[Dropdown ▼]│ │
│                │                       │ │            │ │
│                │                       │ │[📤 Upload] │ │
│                │                       │ │[🔄] [🗑️]  │ │
│                │                       │ │            │ │
│                │                       │ │ℹ️ Upload...│ │
│                │                       │ └────────────┘ │
│                │                       │                │
│                │                       │  Security Tip  │
└────────────────┴───────────────────────┴────────────────┘
```

## 🔧 Komponen VRM Section

### Section: "AVATAR VRM"

**Lokasi**: System Settings → Right Sidebar → Scroll ke bawah

**Komponen:**

1. **📦 Model VRM** (Dropdown)
   - Menampilkan daftar model VRM yang tersedia
   - Format: "NamaModel (X.X MB)"
   - Pilih model untuk mengaktifkan avatar

2. **📤 Upload** (Tombol)
   - Upload file VRM baru dari komputer
   - Support file: `.vrm`
   - Dialog file picker akan muncul

3. **🔄 Refresh** (Tombol kecil)
   - Refresh daftar model VRM
   - Update dropdown dengan model terbaru

4. **🗑️ Delete** (Tombol kecil)
   - Hapus model yang dipilih
   - Akan muncul konfirmasi sebelum hapus

5. **Info Label**
   - Menampilkan status dan petunjuk
   - "Upload file VRM untuk mulai menggunakan avatar."
   - "Model aktif. Avatar akan ditampilkan di panel kanan."

## 📥 Cara Upload Model VRM

### Metode 1: Via Tombol Upload

1. Klik icon **⚙️ Settings** di sidebar kiri
2. Di **right sidebar**, scroll ke bawah
3. Temukan section **"AVATAR VRM"**
4. Klik tombol **"📤 Upload"**
5. Dialog file akan terbuka
6. Pilih file `.vrm` dari komputer Anda
7. Klik **Open**
8. Model akan di-copy ke folder `assets/vrm_models/`
9. Model otomatis muncul di dropdown dan diaktifkan

### Metode 2: Manual Copy

1. Copy file `.vrm` Anda
2. Paste ke folder: `assets/vrm_models/`
3. Kembali ke aplikasi
4. Klik tombol **🔄 Refresh**
5. Model akan muncul di dropdown
6. Pilih model dari dropdown untuk mengaktifkan

## 🎭 Melihat Avatar Preview

### Di System Settings:

1. Upload atau pilih model VRM
2. Lihat **kolom kanan** halaman Settings
3. Ada box **"🎭 Avatar Preview"**
4. Avatar 3D akan ditampilkan di sana

### Layout Avatar Preview:

```
┌──────────────────────────┐
│   MAIN CONTENT AREA      │
├──────────────────────────┤
│                          │
│  [Settings Forms]        │
│                          │
└──────────────────────────┘

┌──────────────────────────┐
│  AVATAR PREVIEW BOX      │
├──────────────────────────┤
│  🎭 Avatar Preview       │
│  ┌────────────────────┐  │
│  │                    │  │
│  │   [3D Avatar]      │  │
│  │                    │  │
│  └────────────────────┘  │
│  Pilih model di sidebar │
└──────────────────────────┘
```

## 🔄 Ganti Model Aktif

1. Buka System Settings
2. Di right sidebar, section "AVATAR VRM"
3. Klik dropdown **"📦 Model VRM"**
4. Pilih model yang diinginkan
5. Avatar akan langsung berganti di preview

## 🗑️ Hapus Model

1. Pilih model yang ingin dihapus di dropdown
2. Klik tombol **"🗑️"**
3. Dialog konfirmasi akan muncul
4. Klik **Yes** untuk konfirmasi
5. Model akan dihapus dari sistem

**⚠️ PERINGATAN**: 
- Penghapusan tidak dapat dibatalkan
- File akan dihapus dari `assets/vrm_models/`
- Jika model aktif dihapus, avatar akan kosong

## 📂 Lokasi File

### Model VRM:
```
D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\
└── assets/
    └── vrm_models/
        ├── model1.vrm
        ├── model2.vrm
        └── VIPE_Hero__2803.vrm  (default)
```

### Konfigurasi:
```
D:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo\
└── config/
    └── vrm_settings.json
```

**Format vrm_settings.json:**
```json
{
  "active_model": "D:/path/to/assets/vrm_models/model1.vrm",
  "last_expression": "neutral"
}
```

## 🔍 Troubleshooting

### "Saya tidak melihat section AVATAR VRM"

**Penyebab:**
- VRM Integration tidak tersedia
- QtWebEngine tidak terinstall

**Solusi:**
1. Pastikan melihat message: `✅ VRM Integration available` saat startup
2. Install QtWebEngine: `pip install PyQt6-WebEngine`
3. Restart aplikasi

### "Tombol upload tidak terlihat"

**Checklist:**
1. ✅ Sudah klik icon ⚙️ Settings?
2. ✅ Melihat ke **RIGHT SIDEBAR** (bukan center)?
3. ✅ Sudah scroll ke bawah di sidebar?
4. ✅ Melihat text "AVATAR VRM"?
5. ✅ VRM Integration available?

**Jika masih tidak terlihat:**
```bash
# Cek apakah VRM available
python test_vrm_ui.py

# Harus melihat:
# ✅ VRM Integration available
# ✅ VRM section WILL be added to SystemConnectivitySidebar
```

### "Dropdown menunjukkan '(Belum ada model)'"

**Solusi:**
1. Upload model VRM baru via tombol Upload
2. Atau copy file .vrm manual ke `assets/vrm_models/`
3. Klik tombol 🔄 Refresh

### "Avatar tidak tampil setelah upload"

**Checklist:**
1. File VRM valid? (coba buka di VRoid Hub Viewer)
2. Model sudah dipilih di dropdown?
3. Cek console untuk error messages
4. Lihat avatar preview di kolom kanan Settings page

## 📚 Informasi Tambahan

### Format File VRM
- **Extension**: `.vrm`
- **Supported Version**: VRM 0.0, VRM 1.0
- **Recommended Size**: < 20 MB
- **Source**: VRoid Studio, VRoid Hub, atau VRM exporters lainnya

### Download Model VRM Gratis
1. **VRoid Hub**: https://hub.vroid.com/
2. **Booth.pm**: https://booth.pm/
3. **VRoid Studio**: Create your own avatar

### Tips
- Gunakan model dengan file size kecil untuk performa lebih baik
- Test model di VRoid Viewer sebelum upload
- Backup model favorit Anda
- Gunakan nama file yang deskriptif

---

## ✅ Ringkasan

**LOKASI TOMBOL UPLOAD:**
```
Settings (⚙️) → Right Sidebar → Scroll Down → "AVATAR VRM" → "📤 Upload"
```

**PENTING:**
- ⚠️ Tombol ada di **RIGHT SIDEBAR**, bukan di main content!
- ⚠️ Harus **SCROLL DOWN** di sidebar untuk melihatnya!
- ⚠️ Harus di halaman **SETTINGS**, bukan Dashboard!

**CARA CEPAT:**
1. Klik ⚙️
2. Lihat kanan
3. Scroll bawah
4. Klik 📤 Upload

---

**Dibuat**: 2024
**Aplikasi**: Niutron v1.0.0
**Feature**: VRM Avatar Management
