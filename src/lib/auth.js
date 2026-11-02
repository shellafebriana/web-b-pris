import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const TOKEN_EXPIRY = '24h'
const BCRYPT_COST = 10
const CADANGAN_DEV = 'dev-only-secret-jangan-dipakai-di-production'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

// ---------------------------------------------------------------------
// Kunci JWT
// ---------------------------------------------------------------------
// Repo ini publik, jadi kunci cadangan siapa pun bisa membacanya. Di
// production (Vercel, atau `next start`) JWT_SECRET WAJIB diisi: tanpa itu
// token tidak dibuat dan tidak diterima, sehingga tidak ada yang bisa login
// atau memalsukan token. Di `npm run dev` cadangan tetap boleh dipakai supaya
// pengembangan lokal tidak terhambat.
//
// Sengaja dicek saat dipakai, bukan saat file dimuat, supaya `next build`
// tidak gagal walau variabelnya belum tersedia di tahap build.
function kunciJwt() {
  const env = process.env.JWT_SECRET
  if (env) return env
  if (process.env.NODE_ENV === 'production') return null
  return CADANGAN_DEV
}

let sudahPeringatkan = false
export function jwtSiap() {
  const siap = kunciJwt() !== null
  if (!siap && !sudahPeringatkan) {
    console.error('[auth] JWT_SECRET belum diisi. Login dinonaktifkan sampai variabel ini diisi di pengaturan environment.')
    sudahPeringatkan = true
  }
  return siap
}

export function signToken(payload) {
  const kunci = kunciJwt()
  if (!kunci) throw new Error('JWT_SECRET belum diisi')
  return jwt.sign(payload, kunci, { expiresIn: TOKEN_EXPIRY, algorithm: 'HS256' })
}

export function verifyToken(token) {
  const kunci = kunciJwt()
  if (!kunci) {
    jwtSiap()
    return { valid: false, error: 'JWT_SECRET belum diisi' }
  }
  try {
    const decoded = jwt.verify(token, kunci, { algorithms: ['HS256'] })
    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

export function getTokenFromHeader(authHeader) {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

// ---------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------
// Password lama di database tersimpan sebagai base64 (bukan hash). Migrasi
// berjalan bertahap: saat login berhasil dengan password lama, route login
// menyimpan ulang password itu dalam bentuk bcrypt. Akun baru langsung bcrypt.

function formatBcrypt(tersimpan) {
  return typeof tersimpan === 'string' && /^\$2[aby]\$\d{2}\$/.test(tersimpan)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST)
}

/**
 * @returns {Promise<{ cocok: boolean, perluUpgrade: boolean }>}
 *   perluUpgrade = true kalau cocok tapi masih format base64 lama.
 */
export async function comparePassword(password, tersimpan) {
  if (typeof password !== 'string' || typeof tersimpan !== 'string') {
    return { cocok: false, perluUpgrade: false }
  }

  if (formatBcrypt(tersimpan)) {
    return { cocok: await bcrypt.compare(password, tersimpan), perluUpgrade: false }
  }

  // Format lama. timingSafeEqual supaya lama perbandingan tidak membocorkan
  // berapa karakter yang sudah benar.
  const a = Buffer.from(Buffer.from(password).toString('base64'))
  const b = Buffer.from(tersimpan)
  const cocok = a.length === b.length && crypto.timingSafeEqual(a, b)
  return { cocok, perluUpgrade: cocok }
}

// ---------------------------------------------------------------------
// User yang sedang login
// ---------------------------------------------------------------------
// Dipakai di Server Component / Server Action untuk membaca user yang login
// lewat cookie httpOnly (bukan localStorage, karena server tidak bisa
// mengakses localStorage).
export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  const verification = verifyToken(token)
  if (!verification.valid) return null

  return verification.data // { id, username, role }
}