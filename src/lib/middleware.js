import { verifyToken, getTokenFromHeader } from './auth'
import { NextResponse } from 'next/server'

export function authMiddleware(handler) {
  return async (req, res) => {
    const authHeader = req.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const verification = verifyToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token', details: verification.error },
        { status: 401 }
      )
    }

    // Attach user data ke request
    req.user = verification.data
    return handler(req, res)
  }
}

export function requireRole(...allowedRoles) {
  return (handler) => {
    return async (req, res) => {
      const authHeader = req.headers.get('authorization')
      const token = getTokenFromHeader(authHeader)

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        )
      }

      const verification = verifyToken(token)
      if (!verification.valid) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        )
      }

      if (!allowedRoles.includes(verification.data.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        )
      }

      req.user = verification.data
      return handler(req, res)
    }
  }
}

export function parseQuery(searchParams) {
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 10
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const filter = searchParams.get('filter') || ''
  const filterValue = searchParams.get('filterValue') || ''

  const skip = (page - 1) * limit

  return {
    page,
    limit,
    skip,
    search,
    sortBy,
    sortOrder,
    filter,
    filterValue,
  }
}
