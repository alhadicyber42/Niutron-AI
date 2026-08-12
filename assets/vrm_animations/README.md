# Niutron VRM Animations (VRMA)

Folder ini untuk menyimpan file animasi VRMA untuk avatar VRM Anda.

## Apa itu VRMA?

VRMA (VRM Animation) adalah format file animasi untuk model VRM.
File ini berisi data motion capture atau animasi custom untuk avatar VRM.

## Cara Menggunakan

1. **Download Animasi VRMA**
   - Kunjungi [VRoid Hub](https://hub.vroid.com/) 
   - Cari "VRM Animation" atau "VRMA"
   - Download file `.vrma`

2. **Letakkan File VRMA**
   - Copy file `.vrma` ke folder ini
   - Niutron akan mendeteksi dan bisa memutar animasi

3. **Memutar Animasi**
   - Gunakan panel kontrol VRM di UI
   - Atau panggil via API: `avatar.play_animation("nama_file")`

## Format yang Didukung

- ✅ VRMA (VRM Animation)
- ✅ BVH (Biovision Hierarchy) - Experimental
- ✅ FBX - Perlu konversi ke VRMA

## Jenis Animasi yang Cocok

- **Idle Animations** - Animasi idle/menunggu
- **Gesture Animations** - Gesture tangan, kepala
- **Emote Animations** - Ekspresi emosi
- **Action Animations** - Aksi seperti wave, point, dll

## Membuat Animasi Sendiri

### Dengan Blender
1. Install [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender)
2. Import model VRM Anda
3. Buat animasi menggunakan bone rigging
4. Export sebagai VRMA

### Dengan Unity
1. Install [UniVRM](https://github.com/vrm-c/UniVRM)
2. Import model VRM
3. Gunakan Animation Clip
4. Export dengan VRM Animation Exporter

### Dengan VRoid Studio
1. Buka model di VRoid Studio
2. Gunakan Pose/Animation tools
3. Export animation

## Animasi Default

Niutron sudah include beberapa animasi default:
- `idle` - Animasi idle sederhana
- `wave` - Melambai
- `nod` - Mengangguk
- `thinking` - Pose berpikir

## Tips Performa

- Gunakan animasi dengan frame rate 30fps
- Hindari animasi yang terlalu panjang (> 10 detik)
- Optimize bone count untuk performa lebih baik

## Resources

- **VRM Animation Specification**: https://github.com/vrm-c/vrm-specification
- **Sample Animations**: https://github.com/vrm-c/vrm-samples
- **VRM Animation Tutorial**: https://docs.vroid.com/en/animations

## Lisensi

Sama seperti model VRM, pastikan Anda memiliki hak untuk menggunakan file animasi.
Cek lisensi dari pembuat animasi.

## Troubleshooting

### Animasi tidak smooth
- Cek frame rate animasi
- Pastikan bone names cocok dengan model

### Animasi tidak berfungsi
- File mungkin korup, coba download ulang
- Format mungkin tidak kompatibel
- Cek console untuk error

## Support

Untuk bantuan lebih lanjut, hubungi community atau buka issue di repository.
