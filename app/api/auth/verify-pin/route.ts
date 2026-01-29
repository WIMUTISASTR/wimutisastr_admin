import { NextRequest, NextResponse } from 'next/server'
import { pinSchema, validateData } from '@/app/lib/validations'
import { handleApiError, AuthenticationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { createPinSessionToken, getPinCookieName, parsePinSessionFromCookieValue } from '@/app/lib/pin-session'

const VALID_PIN = process.env.ADMIN_PIN

if (!VALID_PIN) {
  throw new Error('ADMIN_PIN environment variable is not set')
}

// POST - Verify PIN
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`pin:${clientId}`, RATE_LIMITS.PIN_VERIFICATION)

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(pinSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    const { pin } = validation.data

    if (pin !== VALID_PIN) {
      throw new AuthenticationError('Invalid PIN')
    }

    // Set secure HTTP-only cookie
    const response = NextResponse.json({ success: true })
    const cookieName = getPinCookieName()
    const token = await createPinSessionToken(60 * 60 * 24) // 24 hours
    response.cookies.set(cookieName, token, {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    return handleApiError(error)
  }
}

// GET - Check if PIN is verified
export async function GET(request: NextRequest) {
  try {
    const cookieName = getPinCookieName()
    const pinCookie = request.cookies.get(cookieName)?.value
    const { valid } = await parsePinSessionFromCookieValue(pinCookie)
    if (valid) return NextResponse.json({ verified: true })
    
    return NextResponse.json(
      { verified: false },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Clear PIN verification cookie
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(getPinCookieName())
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

