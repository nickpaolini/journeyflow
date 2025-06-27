import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { password, accessToken, refreshToken } = await request.json()

    if (!password || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    // Set the session using the tokens from the password reset link
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired reset link' } },
        { status: 400 }
      )
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
} 