import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint to trigger auto-phase check manually
export async function POST(request: NextRequest) {
  try {
    // Call the auto-phase check endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-phase-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    return NextResponse.json({
      message: 'Auto-phase check triggered',
      result: data
    })
  } catch (error) {
    console.error('Error triggering auto-phase check:', error)
    return NextResponse.json({ error: 'Failed to trigger auto-phase check' }, { status: 500 })
  }
}
