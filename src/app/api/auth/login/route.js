import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signToken, comparePassword, hashPassword, jwtSiap } from '@/lib/auth'

// Setiap login gagal dijawab paling cepat 1 detik setelah permintaan masuk.
// Menebak password berkali-kali jadi jauh lebih lambat, tanpa tabel tambahan.
// Dihitung dari awal permintaan (bukan jeda tambahan) supaya semua jenis
// gagal butuh waktu yang sama, sehingga lama respons tidak membocorkan
// apakah sebuah username terdaftar.
const JEDA_GAGAL_MS = 1000
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms))

const PESAN_SALAH = 'Username atau password salah'

async function gagalLogin(mulai, pesan, status = 401) {
  await tunggu(Math.max(0, JEDA_GAGAL_MS - (Date.now() - mulai)))
  return NextResponse.json({ error: pesan }, { status })
}

export async function POST(req) {
  const mulai = Date.now()
  try {
    if (!jwtSiap()) {
      return NextResponse.json(
        { error: 'Login sedang tidak dapat digunakan karena konfigurasi server belum lengkap. Hubungi pengelola aplikasi.' },
        { status: 503 }
      )
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 })
    }

    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return gagalLogin(mulai, PESAN_SALAH)

    const { cocok, perluUpgrade } = await comparePassword(password, user.password)
    if (!cocok) return gagalLogin(mulai, PESAN_SALAH)

    // Dicek SETELAH password benar, supaya pesan ini tidak membocorkan
    // keberadaan akun kepada orang yang tidak tahu password-nya.
    if (!user.isActive) return gagalLogin(mulai, 'Akun ini telah dinonaktifkan. Hubungi administrator.', 403)

    // Migrasi bertahap: password base64 lama disimpan ulang sebagai bcrypt.
    // Kalau penyimpanan gagal, login tetap diteruskan dan dicoba lagi lain kali.
    if (perluUpgrade) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: await hashPassword(password) },
        })
      } catch (error) {
        console.error('Upgrade hash password gagal:', error)
      }
    }

    const token = signToken({
      id: user.id.toString(),
      username: user.username,
      role: user.role,
    })

    // Token hanya dikirim lewat cookie httpOnly, tidak di body respons,
    // supaya tidak bisa dibaca JavaScript di browser.
    const response = NextResponse.json(
      {
        message: 'Login berhasil',
        user: { id: user.id.toString(), username: user.username, role: user.role },
      },
      { status: 200 }
    )

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // sama dengan masa berlaku JWT (24 jam)
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}