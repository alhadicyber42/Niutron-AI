# 🚀 Cara Menjalankan VRM Avatar di Niutron

## Langkah Cepat

### 1. Jalankan Aplikasi
```bash
cd "d:\DATA PC ALI\CLONE APLIKASI\brahmaai\Brahma-Echo"
.venv\Scripts\python.exe main.py
```

### 2. Tunggu 3-5 Detik
Aplikasi akan:
- Load HTML VRM viewer
- Load libraries dari CDN (Three.js, VRM)
- Load model VRM Anda (VIPE_Hero__2803.vrm)

### 3. Lihat Console Output
Anda harus melihat:
```
[VRM] Using ES module version (index_working.html)
[VRM-JS] [VRM] === Niutron VRM Viewer ===
[VRM-JS] [VRM] THREE version: 167
[VRM-JS] [VRM] ✓ Initialization complete
[VRM-JS] [VRM] ✓ API exported to window.vrmAPI
[VRM] vrmAPI ready, loading model: VIPE_Hero__2803.vrm
[VRM-JS] [VRM] ✓✓✓ SUCCESS! VRM displayed
✅ VRM Avatar loaded successfully
```

### 4. Hasil Yang Diharapkan
✅ Avatar VRM 3D muncul di tengah dashboard
✅ Bola kuning TIDAK terlihat lagi
✅ Bisa rotate avatar dengan drag mouse
✅ Bisa zoom dengan scroll mouse

## 🎯 Yang Sudah Diperbaiki

### Problem Sebelumnya:
❌ Error: "THREE.GLTFLoader is not a constructor"
❌ VRM tidak pernah muncul
❌ Library loading gagal
❌ Bola kuning masih terlihat

### Solusi Baru:
✅ Menggunakan ES Modules dengan Import Maps
✅ Three.js r167 (latest stable)
✅ Three-VRM v3.1.5 (latest)
✅ Unpkg CDN (reliable)
✅ Automatic fallback system

## 📁 File Yang Dibuat/Diupdate

```
✅ assets/vrm_viewer/index_working.html  (BARU - solusi utama)
✅ assets/vrm_viewer/index_simple.html   (BARU - fallback)
✅ core/vrm_avatar.py                    (UPDATE - path priority)
✅ ui.py                                 (sudah OK - VRM placement)
📝 VRM_FINAL_SOLUTION.md                (dokumentasi lengkap)
📝 CARA_MENJALANKAN_VRM.md              (file ini)
```

## 🔍 Cara Cek Apakah Berhasil

### 1. Console Check
Jalankan aplikasi dan cari output ini di console:
```
[VRM-JS] [VRM] ✓✓✓ SUCCESS! VRM displayed
```

Jika ada, berarti VRM berhasil di-load! ✅

### 2. Visual Check
Lihat dashboard:
- [ ] VRM avatar terlihat di tengah (bukan bola kuning)
- [ ] Drag mouse = avatar rotate
- [ ] Scroll mouse = avatar zoom
- [ ] Status di bottom-left: "✓ VRM loaded: VIPE_Hero__2803.vrm"

## 🐛 Troubleshooting

### Jika VRM Tidak Muncul

#### Cek 1: Koneksi Internet
VRM membutuhkan internet untuk load libraries dari CDN pertama kali.

**Test**: Buka browser dan akses:
```
https://unpkg.com/three@0.167.0/build/three.module.js
```

Jika gagal = masalah internet/firewall.

#### Cek 2: Console Errors
Lihat apakah ada error di console yang dimulai dengan `[VRM-JS]`.

**Common Errors:**
- "Failed to load resource" = CDN blocked
- "Cannot use import statement" = Qt version terlalu lama
- "VRM conversion error" = File VRM corrupted

#### Cek 3: File VRM Exists
```bash
dir "assets\vrm_models\VIPE_Hero__2803.vrm"
```

File harus ada dan ~5.5 MB.

### Solusi Cepat

#### Restart Aplikasi
Kadang perlu 2-3 kali jalankan untuk CDN cache properly:
```bash
# Tutup aplikasi
# Tunggu 2 detik
# Jalankan lagi
.venv\Scripts\python.exe main.py
```

#### Ganti Model VRM
Upload model baru di Settings → AVATAR VRM:
1. Klik "📤 Upload"
2. Pilih file .vrm Anda
3. Select model dari dropdown
4. Restart aplikasi

#### Clear Cache
Jika masih tidak muncul:
1. Tutup aplikasi
2. Hapus folder cache Qt (optional)
3. Jalankan lagi

## 📞 Debug Mode

Untuk melihat semua log JavaScript, tambahkan di Python:

```python
# Di core/vrm_avatar.py, method _on_js_console_message
def _on_js_console_message(self, level, message, lineNumber, sourceID):
    print(f"[VRM-JS:{lineNumber}] {message}")  # Lebih detail
```

## ✅ Expected Behavior

### Startup Sequence (Normal)
```
0s  - Aplikasi dimulai
1s  - HTML VRM viewer loaded
2s  - Three.js libraries loaded dari CDN
3s  - VRM model parsing dimulai
4s  - VRM added to scene
5s  - ✅ Avatar tampil!
```

### Visual Flow
```
[Loading...] → [Libraries...] → [Parsing VRM...] → [✓ Avatar Visible!]
     1s             2s                3s                  5s
```

## 🎉 Selamat!

Jika Anda melihat VRM avatar di dashboard, berarti implementasi BERHASIL! 🎉

Anda sekarang bisa:
- ✅ Melihat avatar 3D di aplikasi
- ✅ Interact dengan rotate & zoom
- ✅ Upload model VRM sendiri
- ✅ Ganti model kapan saja di Settings

## 📚 Dokumentasi Lengkap

Lihat file-file ini untuk detail lebih lanjut:
- `VRM_FINAL_SOLUTION.md` - Penjelasan teknis lengkap
- `VRM_SIMPLE_FIX.md` - Perubahan yang dilakukan
- `VRM_FIX_SUMMARY.md` - Summary semua fixes

---

**Status**: ✅ SIAP DIGUNAKAN
**Confidence**: 🟢 HIGH
**Support**: Jika masih ada masalah, share console output lengkap
