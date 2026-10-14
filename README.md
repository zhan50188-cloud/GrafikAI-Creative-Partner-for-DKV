# GrafikAI — Creative Partner for DKV

Asisten kreatif berbasis AI untuk siswa dan desainer **Desain Komunikasi Visual (DKV)**.
GrafikAI membantu mencari ide, menyusun konsep, dan mengembangkan kreativitas — sebagai
*partner*, bukan pengganti kreativitas manusia.

> **Mode demo:** Semua hasil generator adalah simulasi lokal yang berjalan di browser,
> dibentuk dari input (tema + gaya) yang kamu pilih. Tidak ada koneksi ke AI API eksternal.
> Jika nanti AI API tersedia, modul generator bisa dihubungkan tanpa mengubah antarmuka.

## Cara menjalankan

Aplikasi ini murni **HTML + CSS + JavaScript**, tanpa proses build.

### Opsi 1 — paling cepat
Buka **`index.html`** langsung di browser (klik dua kali). Aplikasi memakai script
klasik yang sudah dibundel (`js/grafikai.bundle.js`), jadi bisa jalan dari `file://`.

### Opsi 2 — lewat server lokal (opsional, untuk mode modul)
Jika kamu ingin mengembangkan versi modular (`js/core.js`, `js/generators.js`,
`js/pages.js`, `js/app.js`), jalankan server statis karena ES modules butuh HTTP:

```bash
# Python 3
python -m http.server 8080
# atau Node
npx serve .
```

lalu buka `http://localhost:8080`. Untuk memakai versi modul, ubah di `index.html`:

```html
<script type="module" src="js/app.js"></script>
```

## Fitur

| Halaman | Fitur |
|---|---|
| **Landing** | Hero "Your Creative Mind, Amplified by AI" + tombol Start Creating |
| **Dashboard** | Semua fitur dalam bentuk card |
| **AI Workspace** | Idea Generator, Poster Concept Maker, Design Brief, Moodboard, Prompt Generator |
| **Portfolio Builder** | 6 template DKV, kelola halaman (tambah/hapus/urut), case study, multi-gambar, export PDF |
| **Poster Editor** | Editor elemen interaktif: 8 template, drag/select/resize, layer, undo/redo, duplicate, zoom, export PDF/PNG |
| **Template Gallery** | 6 template poster + 6 portofolio, Use/Customize |
| **Color Studio** | Palet warna harmonis (analog/komplementer/triadik/monokrom), klik untuk salin |
| **Typography Studio** | Rekomendasi pasangan font per gaya + panduan ukuran |
| **My Projects** | Simpan, lihat, salin, dan hapus proyek (localStorage) |
| **About** | Tujuan GrafikAI sebagai partner kreatif DKV |

## Struktur

```
GrafikAi/
├─ index.html                 # shell + navigasi
├─ css/styles.css             # design system (hitam/putih/ungu, editorial studio)
├─ js/
│  ├─ grafikai.bundle.js      # build klasik yang dipakai index.html (jalan dari file://)
│  ├─ core.js                 # util: DOM, toast, clipboard, store (localStorage)
│  ├─ generators.js           # mesin demo: ide, poster, palet, font, brief, moodboard, prompt
│  ├─ pages.js                # render tiap halaman
│  ├─ layout-builder.js       # Portfolio & Poster builder, template gallery, export PDF/PNG
│  └─ app.js                  # hash router + wiring navigasi
└─ README.md
```

## Catatan fungsional

- Semua tombol, navigasi, dan form berfungsi.
- Hasil generator relevan dengan input (tema & gaya), bukan acak buta.
- Fitur **salin warna**, **salin prompt**, dan **simpan proyek** berfungsi.
- Data proyek disimpan konsisten di `localStorage`; error ditangani dengan pesan toast.
- Responsif untuk laptop maupun HP (navigasi hamburger di layar kecil).
