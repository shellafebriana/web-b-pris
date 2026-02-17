import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'
const TOKEN_EXPIRY = '24h'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
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

export function hashPassword(password) {
  // Simple hash - untuk production gunakan bcrypt
  return Buffer.from(password).toString('base64')
}

export function comparePassword(password, hash) {
  // Simple compare - untuk production gunakan bcrypt
  return Buffer.from(password).toString('base64') === hash
}
