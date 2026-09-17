import prisma from '@/lib/prisma'
import Mustache from 'mustache'

// ---------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------
export const JENIS_REKAP = 'rekap'
export const JENIS_MONITORING = 'monitoring'

const PREFIX_ID = 'format'
const POLA_ID = /^format(\d+)$/
const MAKS_PERCOBAAN_ID = 5
const MAKS_DESKRIPSI = 191 // String? di MySQL = VARCHAR(191)

const KANAL_VALID = ['ONLINE', 'SOSMED']
const FIELD_WAJIB_VALID = ['title', 'links', 'dateRange']
const GROUP_BY_VALID = ['unit', 'platform', '']
const UNIT_SCOPE_VALID = ['POLSEK', 'POLRES']
const GAYA_LIST_VALID = ['simple', 'summary_first']

// Kunci config yang dikelola editor. Kunci lain (misalnya yang hanya dibaca
// bot) dibiarkan apa adanya saat update, supaya tidak ikut terhapus.
const KUNCI_DIKELOLA = [
  'jenis',
  'requiredPlatform', 'requiredFields', 'hasUnit', 'hasCount', 'countByPlatform',
  'groupBy', 'unitScope', 'platformListStyle', 'shuffle', 'sortByPriority',
  'kanalAktif', 'tampilkanNihil', 'kategoriDikecualikan',
]

// ---------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------

// Format lama tanpa field jenis dianggap rekap (sama dengan monitoring.js).
export function jenisFormat(config) {
  return config && typeof config === 'object' && config.jenis === JENIS_MONITORING
    ? JENIS_MONITORING
    : JENIS_REKAP
}

function nomorId(id) {
  const m = POLA_ID.exec(id)
  return m ? Number(m[1]) : null
}

// Urutan natural: format2 sebelum format10. ID di luar pola ditaruh di akhir.
function bandingkanId(a, b) {
  const na = nomorId(a)
  const nb = nomorId(b)
  if (na !== null && nb !== null) return na - nb
  if (na !== null) return -1
  if (nb !== null) return 1
  return a.localeCompare(b)
}

function daftarTeksUnik(nilai) {
  if (!Array.isArray(nilai)) return []
  const hasil = []
  for (const v of nilai) {
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (t && !hasil.includes(t)) hasil.push(t)
  }
  return hasil
}

function teks(nilai) {
  return typeof nilai === 'string' ? nilai.trim() : ''
}

function pilihan(nilai, valid, cadangan) {
  return valid.includes(nilai) ? nilai : cadangan
}

function validasiTemplate(template) {
  if (!template.trim()) throw new Error('Template wajib diisi')
  try {
    Mustache.parse(template)
  } catch (error) {
    throw new Error(`Template tidak valid: ${error.message}`)
  }
}

function validasiDasar({ name, description, template }) {
  const nama = teks(name)
  const deskripsi = teks(description)
  const isiTemplate = typeof template === 'string' ? template : ''

  if (!nama) throw new Error('Nama format wajib diisi')
  if (deskripsi.length > MAKS_DESKRIPSI) {
    throw new Error(`Deskripsi maksimal ${MAKS_DESKRIPSI} karakter`)
  }
  validasiTemplate(isiTemplate)

  return { name: nama, description: deskripsi || null, template: isiTemplate }
}

async function bersihkanConfigRekap(raw) {
  const diminta = daftarTeksUnik(raw.requiredPlatform)
  if (diminta.length === 0) throw new Error('Pilih minimal satu platform')

  // Nama disamakan dengan master (tanpa beda huruf besar/kecil), karena
  // platform-detect.js mencocokkan nama platform dari tabel Platform.
  const master = await prisma.platform.findMany({ select: { name: true } })
  const petaNama = new Map(master.map((p) => [p.name.toLowerCase(), p.name]))

  const tidakDikenal = diminta.filter((n) => !petaNama.has(n.toLowerCase()))
  if (tidakDikenal.length > 0) {
    throw new Error(`Platform tidak terdaftar di master Platform: ${tidakDikenal.join(', ')}`)
  }
  const requiredPlatform = [...new Set(diminta.map((n) => petaNama.get(n.toLowerCase())))]

  const hasUnit = raw.hasUnit === true
  const countByPlatform = raw.countByPlatform === true

  // groupBy dari editor dipertahankan selama konsisten dengan toggle-nya;
  // kalau tidak, diturunkan ulang dari toggle.
  let groupBy = pilihan(raw.groupBy, GROUP_BY_VALID, '')
  if ((groupBy === 'unit' && !hasUnit) || (groupBy === 'platform' && !countByPlatform) || groupBy === '') {
    groupBy = countByPlatform ? 'platform' : hasUnit ? 'unit' : ''
  }

  return {
    jenis: JENIS_REKAP,
    requiredPlatform,
    requiredFields: daftarTeksUnik(raw.requiredFields).filter((f) => FIELD_WAJIB_VALID.includes(f)),
    hasUnit,
    hasCount: raw.hasCount === true,
    countByPlatform,
    groupBy,
    unitScope: pilihan(raw.unitScope, UNIT_SCOPE_VALID, 'POLSEK'),
    platformListStyle: pilihan(raw.platformListStyle, GAYA_LIST_VALID, 'simple'),
    shuffle: raw.shuffle === true,
    sortByPriority: raw.sortByPriority === true,
  }
}

async function bersihkanConfigMonitoring(raw) {
  // Urutan kanalAktif menentukan huruf A/B di laporan, jadi urutan dijaga.
  const kanalAktif = daftarTeksUnik(raw.kanalAktif).filter((k) => KANAL_VALID.includes(k))
  if (kanalAktif.length === 0) throw new Error('Pilih minimal satu kanal untuk format monitoring')

  const kategori = await prisma.monitoringKategori.findMany({ select: { kode: true } })
  const kodeValid = new Set(kategori.map((k) => k.kode))

  return {
    jenis: JENIS_MONITORING,
    kanalAktif,
    tampilkanNihil: raw.tampilkanNihil !== false,
    kategoriDikecualikan: daftarTeksUnik(raw.kategoriDikecualikan).filter((k) => kodeValid.has(k)),
  }
}

async function bersihkanConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Konfigurasi format tidak valid')
  }
  return jenisFormat(raw) === JENIS_MONITORING
    ? bersihkanConfigMonitoring(raw)
    : bersihkanConfigRekap(raw)
}

// ---------------------------------------------------------------------
// Baca
// ---------------------------------------------------------------------

/**
 * @param {{ jenis?: 'rekap' | 'monitoring' }} opsi  kosong = semua jenis
 */
export async function getAllReportFormatsList({ jenis } = {}) {
  const formats = await prisma.reportFormat.findMany({
    select: {
      id: true, name: true, description: true, isActive: true, config: true,
      _count: { select: { sessions: true } },
    },
  })

  return formats
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      isActive: f.isActive,
      config: f.config,
      jenis: jenisFormat(f.config),
      totalSesi: f._count.sessions,
    }))
    .filter((f) => !jenis || f.jenis === jenis)
    .sort((a, b) => bandingkanId(a.id, b.id))
}

export async function getReportFormatById(id) {
  const format = await prisma.reportFormat.findUnique({
    where: { id: String(id) },
    include: { _count: { select: { sessions: true } } },
  })
  if (!format) return null
  return {
    id: format.id,
    name: format.name,
    description: format.description,
    template: format.template,
    config: format.config,
    isActive: format.isActive,
    jenis: jenisFormat(format.config),
    totalSesi: format._count.sessions,
  }
}

// Nomor terbesar + 1. Nomor format yang dihapus bisa terpakai lagi; aman
// karena format yang masih dipakai sesi tidak bisa dihapus.
export async function getNextReportFormatId() {
  const rows = await prisma.reportFormat.findMany({
    where: { id: { startsWith: PREFIX_ID } },
    select: { id: true },
  })
  const terbesar = rows.reduce((maks, r) => Math.max(maks, nomorId(r.id) ?? 0), 0)
  return `${PREFIX_ID}${terbesar + 1}`
}

// ---------------------------------------------------------------------
// Tulis
// ---------------------------------------------------------------------

export async function createReportFormat({ name, description, template, config, isActive }) {
  const dasar = validasiDasar({ name, description, template })
  const configBersih = await bersihkanConfig(config)

  // ID ditentukan di sini, bukan di form. Kalau dua admin menyimpan
  // bersamaan dan bentrok (P2002), ambil nomor berikutnya lalu coba lagi.
  for (let percobaan = 0; percobaan < MAKS_PERCOBAAN_ID; percobaan++) {
    const id = await getNextReportFormatId()
    try {
      const format = await prisma.reportFormat.create({
        data: { id, ...dasar, config: configBersih, isActive: isActive !== false },
      })
      return { id: format.id }
    } catch (error) {
      if (error.code !== 'P2002') throw error
    }
  }
  throw new Error('ID format gagal dibuat karena bentrok. Silakan coba simpan kembali.')
}

export async function updateReportFormat(id, { name, description, template, config, isActive }) {
  const lama = await prisma.reportFormat.findUnique({
    where: { id: String(id) },
    select: { config: true, _count: { select: { sessions: true } } },
  })
  if (!lama) throw new Error('Format tidak ditemukan')

  const dasar = validasiDasar({ name, description, template })
  const configBersih = await bersihkanConfig(config)

  const jenisLama = jenisFormat(lama.config)
  if (jenisLama !== configBersih.jenis && lama._count.sessions > 0) {
    throw new Error(
      `Jenis format tidak dapat diubah karena format ini digunakan oleh ${lama._count.sessions} sesi rekap`
    )
  }

  const configLama = lama.config && typeof lama.config === 'object' && !Array.isArray(lama.config)
    ? lama.config
    : {}
  const sisaLama = Object.fromEntries(
    Object.entries(configLama).filter(([k]) => !KUNCI_DIKELOLA.includes(k))
  )

  try {
    const format = await prisma.reportFormat.update({
      where: { id: String(id) },
      data: { ...dasar, config: { ...sisaLama, ...configBersih }, isActive: isActive !== false },
    })
    return { id: format.id }
  } catch (error) {
    if (error.code === 'P2025') throw new Error('Format tidak ditemukan')
    throw error
  }
}

export async function deleteReportFormat(id) {
  const totalSesi = await prisma.rekapSession.count({ where: { formatId: String(id) } })
  if (totalSesi > 0) {
    throw new Error(`Format ini tidak dapat dihapus karena digunakan oleh ${totalSesi} sesi rekap`)
  }

  try {
    await prisma.reportFormat.delete({ where: { id: String(id) } })
  } catch (error) {
    // Jaga-jaga kalau ada sesi baru dibuat di antara count dan delete.
    if (error.code === 'P2003') throw new Error('Format ini masih digunakan oleh sesi rekap, sehingga tidak dapat dihapus')
    if (error.code === 'P2025') throw new Error('Format tidak ditemukan')
    throw error
  }
}