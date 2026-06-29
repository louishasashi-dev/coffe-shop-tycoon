# ☕ Coffee Shop Tycoon

Game idle/tycoon bertema kedai kopi, dibangun dengan **HTML5, CSS3, dan
Vanilla JavaScript** murni — tanpa framework, tanpa library eksternal.
Pemain memulai dari kedai kopi kecil dan berkembang menjadi jaringan kopi
besar lewat upgrade peralatan, karyawan, dan bisnis.

## ✨ Fitur Utama

- **Idle income** — uang bertambah otomatis tiap detik, tanpa perlu klik.
- **15 upgrade** di 3 kategori: Equipment, Employee, Business — masing-masing
  punya harga, level, level maksimum, dan income tambahan sendiri.
- **Sistem unlock berantai** — beberapa upgrade lanjutan baru terbuka setelah
  upgrade prasyaratnya mencapai level tertentu.
- **Dashboard** — total uang, income/detik, total karyawan, level kedai,
  total upgrade, waktu bermain, dan statistik detail.
- **Offline income** — saat game dibuka kembali, pendapatan selama offline
  dihitung dan ditampilkan lewat popup "Selamat datang kembali".
- **Auto save** — setiap 30 detik dan setiap kali membeli upgrade.
- **Settings** — save manual, export/import save (kode teks), reset game
  (dengan konfirmasi), dan dark mode.
- **UI modern** — tema coffee brown & cream, glassmorphism ringan, kartu
  membundar dengan soft shadow, serta animasi halus (pulse uang, flash
  upgrade berhasil, asap cangkir kopi di header).

## 📁 Struktur Folder

coffee-shop-tycoon/

│

├── index.html

│

├── css/

│ ├── global.css # Variabel warna/tipografi, reset, komponen (button, card, toast, modal, scrollbar)

│ ├── dashboard.css # Style khusus halaman Dashboard

│ ├── shop.css # Style khusus halaman Shop

│ └── settings.css # Style khusus halaman Settings

│

├── js/

│ ├── utils.js # Fungsi utilitas umum (format uang, format waktu, dll)

│ ├── storage.js # Save / Load / Reset / Export / Import lewat localStorage

│ ├── ui.js # Tab switching, toast, modal/popup generik

│ ├── dashboard.js # Render data ke halaman Dashboard

│ ├── shop.js # Daftar upgrade, harga, pembelian, unlock

│ ├── settings.js # Save manual, export/import, reset, dark mode

│ └── game.js # Game loop, idle income, offline income, autosave (orkestrator utama)

│

├── assets/

│ ├── images/ # Tempat menaruh gambar/ilustrasi tambahan (opsional)

│ ├── icons/ # Tempat menaruh ikon kustom pengganti emoji (opsional)

│ └── sounds/ # Tempat menaruh efek suara (opsional, belum diimplementasikan)

│

└── README.md

## 🚀 Cara Menjalankan

Karena seluruh script memakai tag `<script defer>` biasa (bukan ES Module),
project ini bisa langsung dijalankan dengan membuka `index.html` di browser
modern (Chrome, Firefox, Edge) tanpa server tambahan.

Untuk pengalaman terbaik (terutama saat mengembangkan lebih lanjut),
disarankan menjalankan lewat ekstensi **Live Server** di VS Code:

1. Buka folder project di VS Code.
2. Klik kanan `index.html` → **Open with Live Server**.
3. Game akan terbuka di browser dan otomatis reload saat file disimpan.

## 🧠 Arsitektur JavaScript

Setiap file JS punya satu tanggung jawab (single responsibility),
tidak ada logika yang tumpang tindih antar file:

| File           | Tanggung Jawab                                                  |
| -------------- | --------------------------------------------------------------- |
| `utils.js`     | Fungsi murni: format uang/waktu/angka, random, clamp, deepClone |
| `storage.js`   | Baca/tulis `localStorage`: save, load, reset, export, import    |
| `ui.js`        | Tab switching, toast, modal/popup generik, helper animasi DOM   |
| `dashboard.js` | Merender state ke elemen-elemen halaman Dashboard               |
| `shop.js`      | Definisi upgrade, harga, pembelian, unlock, kalkulasi turunan   |
| `settings.js`  | Save manual, export/import, reset game, dark mode               |
| `game.js`      | Game loop, idle income, offline income, autosave (orkestrator)  |

Pola yang dipakai: setiap file mendefinisikan satu **object literal** global
(`Utils`, `Storage`, `UI`, `Dashboard`, `Shop`, `Settings`, `Game`) berisi
data & method-nya sendiri, sehingga tidak perlu banyak variabel global lepas.
`game.js` dimuat paling akhir karena ia bergantung pada seluruh modul lain.

## 💾 Format Data Save

Save disimpan di `localStorage` dengan key `coffeeShopTycoon_save`, berbentuk:

```json
{
  "version": 1,
  "lastSaveTimestamp": 1719999999999,
  "state": { "money": 1234, "incomePerSecond": 12, "upgrades": { "...": 1 } }
}
```

**Export Save** mengubah objek di atas menjadi satu baris teks (base64),
dan **Import Save** mengembalikannya menjadi objek kembali. Ini memudahkan
pemain memindahkan progres antar perangkat/browser tanpa server backend.

## 🛣️ Ide Pengembangan Lanjutan

Beberapa hal yang bisa ditambahkan di masa depan tanpa mengubah arsitektur:

- Efek suara saat membeli upgrade / uang bertambah (taruh file di `assets/sounds/`).
- Ikon kustom (SVG/PNG) di `assets/icons/` sebagai pengganti emoji.
- Sistem achievement / milestone sederhana.
- Event acak (pelanggan ramai, diskon supplier) memakai `Utils.randomNumber()`.
- Prestige system (reset dengan bonus permanen) untuk late-game.

## 📜 Lisensi

Project ini bebas dipakai dan dikembangkan untuk keperluan belajar maupun
pribadi.
