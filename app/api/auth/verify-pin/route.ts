import { NextRequest, NextResponse } from 'next/server'

const VALID_PIN = process.env.ADMIN_PIN

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || pin !== VALID_PIN) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Set secure HTTP-only cookie instead of localStorage
    const response = NextResponse.json({ success: true })
    response.cookies.set('pinVerified', 'true', {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

