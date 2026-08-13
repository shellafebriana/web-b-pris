import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Urutan sortOrder WAJIB sama dengan urutan cetak di laporan, termasuk
// urutan tidak lazim di nomor 9-10 (Negatif Pemerintah sebelum Positif).
const KATEGORI = [
  { kode: 'POSITIF_POLRI',      nama: 'Isu Berita Positif Polri',      sortOrder: 1,  sentimen: 'POSITIF', subjek: 'POLRI' },
  { kode: 'NEGATIF_POLRI',      nama: 'Isu Berita Negatif Polri',      sortOrder: 2,  sentimen: 'NEGATIF', subjek: 'POLRI' },
  { kode: 'PROVOKASI',          nama: 'Provokasi',                     sortOrder: 3,  sentimen: 'NEGATIF', subjek: 'UMUM' },
  { kode: 'PROPAGANDA',         nama: 'Propaganda',                    sortOrder: 4,  sentimen: 'NEGATIF', subjek: 'UMUM' },
  { kode: 'HOAX',               nama: 'Hoax',                          sortOrder: 5,  sentimen: 'NEGATIF', subjek: 'UMUM', aliases: ['Hoaks'] },
  { kode: 'UJARAN_KEBENCIAN',   nama: 'Ujaran Kebencian',              sortOrder: 6,  sentimen: 'NEGATIF', subjek: 'UMUM' },
  { kode: 'AGITASI',            nama: 'Agitasi',                       sortOrder: 7,  sentimen: 'NEGATIF', subjek: 'UMUM' },
  { kode: 'SARA',               nama: 'SARA',                          sortOrder: 8,  sentimen: 'NEGATIF', subjek: 'UMUM' },
  { kode: 'NEGATIF_PEMERINTAH', nama: 'Isu Berita Negatif Pemerintah', sortOrder: 9,  sentimen: 'NEGATIF', subjek: 'PEMERINTAH' },
  { kode: 'POSITIF_PEMERINTAH', nama: 'Isu Berita Positif Pemerintah', sortOrder: 10, sentimen: 'POSITIF', subjek: 'PEMERINTAH' },
  { kode: 'SOSIAL_BUDAYA',      nama: 'Sosial Budaya',                 sortOrder: 11, sentimen: 'NETRAL',  subjek: 'UMUM', aliases: ['Sosiala Budaya', 'Sosial Media'] },
]

// Ditambang dari 812 judul asli (chat export April-Mei), lalu dipangkas dari
// 184 jadi 105: kata generik ("sebuah", "seorang"), nama orang/tempat sesaat
// ("raffi", "kayun"), dan kata ambigu lintas kategori dibuang. Pemangkasan
// menaikkan akurasi 75,9% -> 77,4% pada pita conf >= 60.
//
// Provokasi, Propaganda, Hoax, Ujaran Kebencian, dan SARA sengaja TANPA rule:
// nol kejadian sepanjang April-Juli, jadi salah tebak di sini lebih mahal
// daripada tidak menebak. Operator yang menaikkan manual.
const RULES = {
  POSITIF_POLRI: [
    ['polresta', 25], ['polsek', 25], ['satreskrim', 25], ['satlantas', 25],
    ['bhabinkamtibmas', 25], ['kapolresta', 25], ['kapolsek', 25], ['restabanyuwangi', 30],
    ['polri', 15], ['bhayangkara', 15], ['polisi', 14], ['kombes', 12], ['aipda', 12],
    ['bripka', 12], ['iptu', 12], ['ipda', 12], ['ditangkap', 10], ['diamankan', 10],
    ['ungkap', 8], ['pelaku', 18], ['pencuri', 18], ['kemacetan', 18], ['sigap', 18],
    ['presisi', 18], ['pemudik', 18], ['personel', 18], ['amankan', 18], ['bongkar', 18],
    ['buru', 18], ['kronologi', 18], ['keselamatan', 18], ['kamtibmas', 18],
    ['patroli', 18], ['lantas', 18],
  ],
  NEGATIF_POLRI: [
    ['oknum polisi', 40], ['oknum anggota', 35], ['polisi diduga', 35], ['pungli', 30],
  ],
  AGITASI: [
    ['mengeluhkan', 25], ['keluhkan', 25], ['dikeluhkan', 25], ['desak', 22],
    ['protes', 22], ['tuntut', 20], ['keresahan', 20], ['resah', 18],
    ['menolak', 18], ['aksi', 12],
  ],
  NEGATIF_PEMERINTAH: [
    ['diduga ilegal', 28], ['disorot', 22], ['soroti', 22], ['dipertanyakan', 22],
    ['gulung tikar', 22], ['tanpa izin', 22], ['ilegal', 20], ['desak', 18],
    ['dikeluhkan', 18], ['keluhan', 16], ['rusak', 15], ['minim', 15],
    ['tumpang', 18], ['pembatasan', 18], ['korban', 10],
  ],
  POSITIF_PEMERINTAH: [
    ['banyuwangikab', 30], ['bupati', 24], ['ipuk', 24], ['pemkab', 24],
    ['dinas', 18], ['baznas', 18], ['ekonomi', 18], ['perkuat', 18], ['pasar', 18],
    ['dukung', 18], ['pembangunan', 18], ['raih', 18], ['petani', 18], ['umkm', 18],
    ['produksi', 18], ['anggaran', 18], ['bandara', 18], ['pariwisata', 18],
    ['perhutani', 15], ['lapas', 15], ['kemenpar', 15], ['kemenag', 15],
    ['dprd', 12], ['pemerintah', 12], ['gelar', 8],
  ],
  SOSIAL_BUDAYA: [
    ['tradisi', 20], ['festival', 20], ['budaya', 18], ['kecelakaan', 18],
    ['gempa', 18], ['banjir', 18], ['wisata', 16], ['tewas', 16], ['meninggal', 16],
    ['kuliner', 16], ['cuaca', 16], ['jadwal', 14], ['tiket', 14],
    ['kopi', 18], ['kapal', 18], ['maut', 18], ['gandrung', 18],
  ],
}

const CONFIG = [
  { key: 'monitoring.ambang_confidence', value: '60',
    label: 'Ambang skor kategori diisi otomatis', category: 'monitoring' },
  { key: 'monitoring.ambang_klaster', value: '0.18',
    label: 'Ambang kemiripan judul untuk klaster isu', category: 'monitoring' },
  { key: 'monitoring.kategori_default', value: 'SOSIAL_BUDAYA',
    label: 'Kategori cadangan saat tidak ada rule yang cocok', category: 'monitoring' },
]

async function main() {
  // Sequential, BUKAN satu $transaction panjang — pool TiDB default 2 detik
  // dan operasi ringan begini lebih aman dijalankan satu per satu.
  for (const k of KATEGORI) {
    await prisma.monitoringKategori.upsert({
      where: { kode: k.kode },
      update: {
        nama: k.nama,
        sortOrder: k.sortOrder,
        sentimen: k.sentimen,
        subjek: k.subjek,
        aliases: k.aliases ?? null,
      },
      create: {
        kode: k.kode,
        nama: k.nama,
        sortOrder: k.sortOrder,
        sentimen: k.sentimen,
        subjek: k.subjek,
        aliases: k.aliases ?? null,
      },
    })
  }
  console.log(`kategori: ${KATEGORI.length} baris`)

  let dibuat = 0
  for (const [kode, list] of Object.entries(RULES)) {
    const kat = await prisma.monitoringKategori.findUnique({ where: { kode } })
    if (!kat) throw new Error(`kategori ${kode} tidak ditemukan`)
    for (const [keyword, bobot] of list) {
      const ada = await prisma.monitoringRule.findFirst({
        where: { keyword, kategoriId: kat.id },
      })
      if (ada) {
        if (ada.bobot !== bobot) {
          await prisma.monitoringRule.update({ where: { id: ada.id }, data: { bobot } })
        }
      } else {
        await prisma.monitoringRule.create({ data: { keyword, bobot, kategoriId: kat.id } })
        dibuat++
      }
    }
  }
  console.log(`rule: ${dibuat} baru dibuat`)

  for (const c of CONFIG) {
    await prisma.appConfig.upsert({
      where: { key: c.key },
      update: { label: c.label, category: c.category },
      create: c,
    })
  }
  console.log(`config: ${CONFIG.length} baris`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())