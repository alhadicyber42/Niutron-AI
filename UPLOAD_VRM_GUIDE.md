# 📤 Panduan Upload & Kelola Model VRM

Panduan cepat untuk upload, pilih, dan kelola avatar VRM Anda sendiri di Niutron!

## 🎯 Fitur Baru

### ✨ Yang Bisa Anda Lakukan:

1. **📤 Upload VRM** - Upload file .vrm dari komputer Anda
2. **📦 Pilih Model** - Switch antar model dengan dropdown
3. **🗑️ Hapus Model** - Hapus model yang tidak digunakan
4. **🔄 Refresh List** - Update daftar model
5. **💾 Auto-Save** - Model terakhir otomatis dimuat saat startup

---

## 🚀 Cara Upload Model VRM

### Step 1: Dapatkan File VRM

**Opsi A: Download dari VRoid Hub** (Gratis!)
1. Kunjungi: https://hub.vroid.com/
2. Browse karakter yang Anda suka
3. Download file .vrm

**Opsi B: Buat Sendiri dengan VRoid Studio**
1. Download VRoid Studio: https://vroid.com/studio
2. Customize karakter Anda
3. Export sebagai VRM

### Step 2: Upload ke Niutron

1. **Buka VRM Panel** di Niutron
2. **Klik tombol "📤 Upload VRM"**
3. **Browse** dan pilih file .vrm Anda
4. **Klik Open**
5. **Done!** Model langsung dimuat ✨

### Step 3: Lihat Avatar Anda

Avatar Anda sekarang aktif dan akan:
- ✅ Bicara dengan lip sync
- ✅ Berubah ekspresi sesuai mood
- ✅ Mengikuti kamera dengan mata
- ✅ Otomatis dimuat setiap kali startup

---

## 🎨 Cara Ganti Model

### Method 1: Via Dropdown

1. Lihat dropdown **📦 Model VRM**
2. Klik dropdown untuk lihat semua model
3. Pilih model yang diinginkan
4. Avatar langsung berubah!

**Contoh:**
```
📦 Model VRM:
  my_avatar (12.3 MB)     ← Model aktif
  cute_girl (8.5 MB)
  robot (15.2 MB)
```

### Method 2: Upload Model Baru

Upload model baru akan otomatis:
- Copy ke folder models
- Muncul di dropdown
- Langsung dimuat sebagai avatar aktif

---

## 🗑️ Cara Hapus Model

1. **Pilih model** yang ingin dihapus dari dropdown
2. **Klik tombol 🗑️** (Delete) di sebelah kanan
3. **Konfirmasi** penghapusan
4. Model dihapus permanen ✅

**⚠️ Perhatian:**
- File akan dihapus permanen
- Tidak bisa di-undo
- Pastikan Anda tidak memerlukan model tersebut lagi

---

## 🔄 Refresh Daftar Model

Jika Anda copy file .vrm secara manual ke folder `assets/vrm_models/`:

1. **Klik tombol 🔄** (Refresh)
2. Dropdown akan update
3. Model baru muncul di list

---

## 📁 Lokasi File

Semua model VRM disimpan di:
```
Brahma-Echo/
  └── assets/
      └── vrm_models/
          ├── avatar_01.vrm
          ├── character_cute.vrm
          └── robot_v2.vrm
```

**Anda bisa:**
- Copy file langsung ke folder ini
- Organize dengan rename files
- Backup folder untuk save koleksi

---

## 🎯 Tips & Tricks

### 💡 Penamaan File

**Recommended:**
```
✅ character_female_casual.vrm
✅ robot_mecha_v2.vrm
✅ avatar_formal.vrm
```

**Avoid:**
```
❌ model.vrm (terlalu generic)
❌ 123.vrm (tidak deskriptif)
❌ my avatar final.vrm (ada spasi)
```

### 📊 Ukuran File

**Rekomendasi:**
- **5-10 MB**: Optimal (cepat load)
- **10-15 MB**: Good balance
- **15-25 MB**: High quality (sedikit lambat)
- **>25 MB**: Mungkin terlalu besar

**File terlalu besar?**
- Reduce texture size di VRoid Studio
- Optimize mesh
- Remove unused blend shapes

### 🎨 Model Recommendations

**Best Models:**
1. **VRoid Hub Official**: Guaranteed compatibility
2. **VRoid Studio Export**: Fully customizable
3. **VRM 1.0**: Latest standard

**Avoid:**
- Custom modified VRM (mungkin tidak kompatibel)
- VRM dengan textures > 4K
- Model dengan terlalu banyak accessories

---

## 🐛 Troubleshooting

### Model tidak muncul setelah upload

**Solusi:**
1. Check file ada di `assets/vrm_models/`
2. File harus ekstensi `.vrm` (lowercase)
3. Klik tombol 🔄 untuk refresh
4. Restart aplikasi

### Avatar hitam / tidak terlihat

**Solusi:**
1. Try model lain dari VRoid Hub
2. Check lighting di VRM viewer
3. Model mungkin corrupt - redownload

### Upload error "Permission denied"

**Solusi:**
1. Run Niutron sebagai Administrator
2. Check folder permissions
3. Try save ke lokasi lain dulu, lalu copy manual

### Model load tapi tidak animate

**Solusi:**
1. Model must have VRM blend shapes
2. Test dengan official VRoid model
3. Check console untuk error messages

---

## 📚 Resources

### Free VRM Models
- **VRoid Hub**: https://hub.vroid.com/
- **Booth**: https://booth.pm/ (search "VRM")
- **VRoid Sample Models**: Official test models

### Tools
- **VRoid Studio**: https://vroid.com/studio
- **Blender VRM Addon**: For advanced editing
- **VRM Viewer**: https://vrm.dev/

### Documentation
- `docs/VRM_MODEL_MANAGEMENT.md` - Complete guide
- `docs/VRM_INTEGRATION.md` - Technical details
- `QUICK_START_VRM.md` - Quick start

---

## ✨ Advanced: Batch Upload

Jika Anda punya banyak model:

### Windows PowerShell:
```powershell
# Copy all VRM from Downloads to models folder
Copy-Item "$env:USERPROFILE\Downloads\*.vrm" "assets\vrm_models\"
```

### Manual Method:
1. Open folder `assets/vrm_models/`
2. Copy/paste semua file .vrm sekaligus
3. Klik 🔄 di Niutron untuk refresh

---

## 🎉 Done!

Sekarang Anda bisa:
✅ Upload model VRM sendiri  
✅ Switch antar model dengan mudah  
✅ Hapus model yang tidak dipakai  
✅ Organize koleksi avatar Anda  
✅ Model auto-load saat startup  

**Have fun dengan avatar VRM Anda! 🎭✨**

---

## 🆘 Butuh Bantuan?

1. Baca `docs/VRM_MODEL_MANAGEMENT.md` untuk detail lengkap
2. Check console log untuk error messages
3. Test dengan official VRoid Hub models
4. Restart aplikasi jika ada masalah

---

**Quick Links:**
- 📚 Full Documentation: `docs/VRM_MODEL_MANAGEMENT.md`
- 🚀 Quick Start: `QUICK_START_VRM.md`
- 🎨 VRoid Hub: https://hub.vroid.com/
- 🛠️ VRoid Studio: https://vroid.com/studio

**Happy customizing! 🎨**
