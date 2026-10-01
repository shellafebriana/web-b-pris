import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { parseQuery } from '@/lib/middleware'
import { cekAuth, ok, okDaftar, gagal, bacaJson } from '@/lib/api-route'
import { getAllPlatforms, createPlatform } from '@/lib/models/platform'

export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10))
    const search = searchParams.get('search') || ''

    const { data, pagination } = await getAllPlatforms({ search, page, limit })
    return okDaftar(data, 'Data platform berhasil diambil', { pagination })
  } catch (error) {
    return gagal(error, 'GET Platform')
  }
}

export async function POST(req) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { name, domain, category } = await bacaJson(req)
    const platform = await createPlatform({ name, domain, category })
    return ok(platform, 'Platform berhasil dibuat', 201)
  } catch (error) {
    return gagal(error, 'POST Platform')
  }
}
