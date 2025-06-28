import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  id: string
  email: string
}

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Get the authenticated user from a request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return null
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true }
    })

    return user
  } catch (error) {
    console.error('Error getting auth user:', error)
    return null
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return null
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      email: user.email
    }
  } catch (error) {
    console.error('Error authenticating user:', error)
    return null
  }
}

/**
 * Create a new user account
 */
export async function createUser(email: string, password: string): Promise<AuthUser> {
  const passwordHash = await hashPassword(password)
  
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash
    },
    select: {
      id: true,
      email: true
    }
  })

  return user
}

/**
 * Login or register user (one-button approach)
 */
export async function loginOrRegister(email: string, password: string): Promise<AuthUser> {
  // First try to authenticate existing user
  const existingUser = await authenticateUser(email, password)
  if (existingUser) {
    return existingUser
  }

  // Check if user exists but password is wrong
  const userExists = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (userExists) {
    throw new Error('Invalid password')
  }

  // Create new user
  return createUser(email, password)
}
