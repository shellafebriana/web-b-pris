import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signToken, comparePassword } from '@/lib/auth'

export async function POST(req) {
  try {
    const { username, password } = await req.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      )
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = comparePassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      )
    }

    // Generate token
    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    return NextResponse.json(
      {
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login', details: error.message },
      { status: 500 }
    )
  }
}
