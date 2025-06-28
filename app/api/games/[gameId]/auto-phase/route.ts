import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { hostId, enabled, durationHours } = await request.json()
    
    if (!hostId) {
      return NextResponse.json({ error: 'Host ID is required' }, { status: 400 })
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can configure auto-phase' }, { status: 403 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game must be in progress' }, { status: 400 })
    }

    // Update auto-phase settings
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        autoPhaseEnabled: enabled,
        phaseDurationHours: durationHours || 12,
        phaseStartTime: enabled ? new Date() : null
      }
    })

    return NextResponse.json({
      message: enabled ? 'Auto-phase enabled' : 'Auto-phase disabled',
      autoPhaseEnabled: updatedGame.autoPhaseEnabled,
      phaseDurationHours: updatedGame.phaseDurationHours,
      phaseStartTime: updatedGame.phaseStartTime
    })
  } catch (error) {
    console.error('Error configuring auto-phase:', error)
    return NextResponse.json({ error: 'Failed to configure auto-phase' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        autoPhaseEnabled: true,
        phaseDurationHours: true,
        phaseStartTime: true,
        currentPhase: true,
        currentDay: true
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Calculate time remaining if auto-phase is enabled
    let timeRemaining = null
    if (game.autoPhaseEnabled && game.phaseStartTime) {
      const phaseEndTime = new Date(game.phaseStartTime.getTime() + (game.phaseDurationHours * 60 * 60 * 1000))
      const now = new Date()
      timeRemaining = Math.max(0, phaseEndTime.getTime() - now.getTime())
    }

    return NextResponse.json({
      autoPhaseEnabled: game.autoPhaseEnabled,
      phaseDurationHours: game.phaseDurationHours,
      phaseStartTime: game.phaseStartTime,
      currentPhase: game.currentPhase,
      currentDay: game.currentDay,
      timeRemaining
    })
  } catch (error) {
    console.error('Error fetching auto-phase status:', error)
    return NextResponse.json({ error: 'Failed to fetch auto-phase status' }, { status: 500 })
  }
}
