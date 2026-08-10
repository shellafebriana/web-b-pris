# B-PRIS

Web admin untuk mengelola rekapitulasi link amplifikasi media sosial dan media online di lingkungan Humas Polresta Banyuwangi.

## Latar Belakang

Setiap hari, operator dari tiap Polsek dan Satfung mengirimkan link konten yang sudah diunggah ke grup WhatsApp. Link-link itu harus direkap, dikelompokkan per platform atau per unit, lalu disusun ulang menjadi laporan berformat baku untuk dikirim ke pimpinan — dengan berbagai format berbeda tergantung jenis laporannya.

Proses manual ini memakan waktu dan rawan salah hitung. B-PRIS mengotomatiskannya: **bot WhatsApp** menangkap link dari operator, dan **web admin ini** mengelola datanya sampai jadi teks laporan yang tinggal disalin.

## Arsitektur

Sistem ini terdiri dari dua aplikasi yang berbagi satu database MySQL:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Bot WhatsApp          │         │   Web Admin (repo ini)  │
│   (repo terpisah)       │         │                         │
│                         │         │  • CRUD master data     │
│  • Terima link operator │         │  • Kelola sesi rekap    │
│  • Auto-detect platform │         │  • Paste bulk manual    │
│  • Assign unit pengirim │         │  • Generate laporan     │
│  • Buat sesi rekap      │         │  • Dashboard statistik  │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                   │
            │         ┌───────────────┐         │
            └────────►│  MySQL / TiDB │◄────────┘
                      └───────────────┘
```

Bot yang menulis data mentah, web ini yang mengelola dan mengolahnya jadi laporan. Master data (platform, unit, format) diedit lewat web, lalu dibaca oleh bot.

## Alur Kerja

1. Operator unit mengirim link ke bot WhatsApp
2. Bot mendeteksi platform dari domain URL, menandai unit pengirim, dan menyimpannya dalam satu `RekapSession`
3. Admin membuka sesi tersebut di web — menambah link yang terlewat, memperbaiki unit yang salah, menghapus duplikat
4. Admin memilih format laporan, sistem me-render template Mustache dengan data link tersebut
5. Hasilnya disalin ke WhatsApp untuk dikirim ke pimpinan

## Fitur

**Dashboard** — statistik jumlah link per platform dan per periode dalam bentuk chart.

**Master Data** — CRUD untuk Platform (beserta daftar domain untuk auto-detect), Unit (POLRES/POLSEK/SATFUNG), dan Format Rekap.

**Editor Format Rekap** — editor template Mustache full-screen dengan live preview dan drag-drop variable chip. Setiap format punya konfigurasi sendiri: apakah dikelompokkan per unit atau per platform, apakah link diberi nomor urut, platform apa saja yang boleh masuk, apakah urutannya diacak.

**Link Prioritas** — daftar keyword yang bisa diurutkan drag-and-drop. Link yang cocok dengan keyword berprioritas tinggi akan muncul di urutan atas laporan.

**Sesi Rekap** — daftar sesi dengan pencarian dan filter status/format, plus halaman detail dua kolom: daftar link di kiri, panel generate di kanan.

**Paste Bulk** — tempel banyak link sekaligus. Platform terdeteksi dari domain, dan unit terdeteksi dari header bertanda bintang (`*TANJUNGWANGI*`) sesuai kebiasaan format pesan di grup WhatsApp. Dilengkapi deteksi duplikat dan peringatan bila platform tidak sesuai format yang dipilih.

**Generate Laporan** — render Mustache jadi teks siap kirim, hasilnya tersimpan di sesi sehingga bisa dibuka ulang.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router) |
| UI | React, Tailwind CSS |
| Database | MySQL — TiDB Serverless |
| ORM | Prisma |
| Autentikasi | JWT + bcryptjs |
| Template laporan | Mustache |
| Chart | Recharts |
| Drag & drop | @dnd-kit |

## Persyaratan

- Node.js 20+
- MySQL (lokal atau TiDB Serverless)

## Instalasi

```bash
git clone https://github.com/shellafebriana/web-b-pris.git
cd web-b-pris
npm install
cp .env.example .env
```

Isi `.env`:

```env
DATABASE_URL="mysql://user:password@host:3306/nama_database"
JWT_SECRET="ganti-dengan-string-acak-yang-panjang"
```

`JWT_SECRET` dipakai untuk menandatangani token login. Wajib diisi — jangan biarkan memakai nilai default.

```bash
npx prisma generate      # wajib, sebelum menjalankan apa pun
npx prisma migrate dev   # lewati jika database sudah berisi tabel
npm run prisma:seed      # opsional, isi master data awal
npm run dev
```

Buka http://localhost:3000

## Struktur Folder

```
prisma/
  schema.prisma      # Definisi model database
  seed.js            # Master data awal
public/              # Aset statis
src/
  app/
    api/             # REST endpoint (App Router route handlers)
    (halaman)/       # Dashboard, unit, platform, sesi-rekap, dll
  components/        # Komponen UI
  lib/
    prisma.js        # Prisma client singleton
    auth.js          # Sign & verify JWT
    api-client.js    # Wrapper fetch ke /api
```

## Model Database

| Model | Keterangan |
|---|---|
| `AppConfig` | Pengaturan global berbasis key-value, mis. nama pejabat penandatangan |
| `Platform` | Master platform beserta daftar domain untuk auto-detect |
| `Unit` | Master unit dengan tipe POLRES / POLSEK / SATFUNG |
| `ReportFormat` | Template Mustache beserta konfigurasi laporan (JSON) |
| `PriorityLink` | Keyword prioritas untuk pengurutan link dalam laporan |
| `Operator` | Operator WhatsApp, diidentifikasi dari nomor pengirim |
| `RekapSession` | Sesi rekap, menyimpan format terpilih dan hasil generate |
| `Link` | Link individual dalam sebuah sesi |
| `User` | Akun login admin |

## Deployment

Deploy otomatis ke Vercel melalui GitHub Actions setiap push ke `master`. Secrets yang perlu diset di repository settings:

| Secret | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi database produksi |
| `VERCEL_TOKEN` | Token akses Vercel |
| `VERCEL_ORG_ID` | ID organisasi Vercel |
| `VERCEL_PROJECT_ID` | ID project Vercel |

## Status

Dikembangkan dan digunakan untuk kebutuhan internal Humas Polresta Banyuwangi. Masih tahap development.