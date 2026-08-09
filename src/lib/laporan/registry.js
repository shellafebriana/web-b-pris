import {
  getRekapMediaSosial,
  getRekapMediaOnline,
  FORMAT_MEDIA_SOSIAL,
  FORMAT_MEDIA_ONLINE,
} from '@/lib/models/laporan'
import { getRekapKontenRayon } from '@/lib/models/rilis'

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
  'konten-rayon': {
    judul: 'Laporan Konten Rayon',
    judulCetak: 'KEAKTIFAN PENGIRIMAN BAHAN RILIS POLSEK JAJARAN PADA GRUP RAYON',
    kolomEntitas: 'POLSEK',
    formatId: null,               
    namaFile: 'rekap-konten-rayon',
    ambil: getRekapKontenRayon,
  },
}