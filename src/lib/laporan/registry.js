import {
  getRekapMediaSosial,
  getRekapMediaOnline,
  FORMAT_MEDIA_SOSIAL,
  FORMAT_MEDIA_ONLINE,
} from '@/lib/models/laporan'

export const JENIS_LAPORAN = {
  'media-sosial': {
    judul: 'Laporan Media Sosial',
    judulCetak: 'KEAKTIFAN VIRALISASI KONTEN MEDIA SOSIAL',
    kolomEntitas: 'POLSEK',
    formatId: FORMAT_MEDIA_SOSIAL,
    namaFile: 'rekap-media-sosial',
    ambil: getRekapMediaSosial,
  },
  'media-online': {
    judul: 'Laporan Media Online',
    judulCetak: 'KEAKTIFAN VIRALISASI KONTEN MEDIA ONLINE',
    kolomEntitas: 'POLSEK',
    formatId: FORMAT_MEDIA_ONLINE,
    namaFile: 'rekap-media-online',
    ambil: getRekapMediaOnline,
    punyaKelengkapan: true,
  },
}