// Mengganti password SATU akun login web (tabel User), disimpan sebagai bcrypt.
//
// Pemakaian:
//   npm run user:ubah-password -- <username>
//
// Yang diubah hanya kolom `password` milik akun yang disebut. Tidak membuat,
// menghapus, atau mengubah akun lain. Password diketik tersembunyi (tidak
// tampil di layar) dan diminta dua kali untuk konfirmasi.

import readline from 'node:readline'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const MIN_PANJANG = 8
const BCRYPT_COST = 10 // samakan dengan src/lib/auth.js

function tanyaTersembunyi(label) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Tampilkan label, lalu sembunyikan setiap karakter yang diketik.
    rl._writeToOutput = (teks) => {
      if (teks.includes(label)) rl.output.write(label)
    }
    rl.question(label, (jawaban) => {
      rl.close()
      process.stdout.write('\n')
      resolve(jawaban)
    })
  })
}

async function main() {
  const username = process.argv[2]?.trim()
  if (!username) {
    console.error('Sebutkan username. Contoh: npm run user:ubah-password -- admin')
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true, isActive: true },
    })
    if (!user) {
      console.error(`Akun "${username}" tidak ditemukan. Tidak ada yang diubah.`)
      process.exitCode = 1
      return
    }

    console.log(`Akun ditemukan: ${user.username} (role: ${user.role}, ${user.isActive ? 'aktif' : 'nonaktif'})`)

    const baru = await tanyaTersembunyi('Password baru: ')
    if (baru.length < MIN_PANJANG) {
      console.error(`Password minimal ${MIN_PANJANG} karakter. Tidak ada yang diubah.`)
      process.exitCode = 1
      return
    }
    const ulang = await tanyaTersembunyi('Ulangi password baru: ')
    if (baru !== ulang) {
      console.error('Kedua password tidak sama. Tidak ada yang diubah.')
      process.exitCode = 1
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(baru, BCRYPT_COST) },
    })
    console.log(`Password akun "${user.username}" berhasil diganti.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Gagal:', e.message)
  process.exitCode = 1
})