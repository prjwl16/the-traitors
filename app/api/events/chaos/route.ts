import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { generateChaosEvent as generateAIChaosEvent, GameContext } from '../../../../lib/openaiClient'


export async function POST(request: NextRequest) {
  try {
    const { gameId, hostId } = await request.json()
    
    if (!gameId || !hostId) {
      return NextResponse.json({ error: 'Game ID and Host ID are required' }, { status: 400 })
    }

    // Get game data
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        chaosEvents: true
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can trigger chaos events' }, { status: 403 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game must be in progress' }, { status: 400 })
    }

    // Check if chaos event already exists for current phase/day
    const existingEvent = game.chaosEvents.find(
      e => e.phase === game.currentPhase && e.day === game.currentDay
    )

    if (existingEvent) {
      return NextResponse.json({ 
        event: existingEvent,
        message: 'Chaos event already exists for this phase'
      })
    }

    // Get current game state for event generation
    const alivePlayers = game.players.filter(p => p.isAlive)
    const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR').length
    const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL').length
    
    const gameState = {
      alivePlayers: alivePlayers.length,
      aliveTraitors,
      aliveFaithfuls,
      currentDay: game.currentDay,
      currentPhase: game.currentPhase
    }

    // Generate chaos event using OpenAI
    const gameContext: GameContext = {
      gameId,
      currentPhase: game.currentPhase,
      currentDay: game.currentDay,
      playerCount: game.players.length,
      alivePlayerCount: alivePlayers.length
    }

    const chaosEventContent = await generateAIChaosEvent(gameContext)
    const chaosEvent = {
      type: 'AI_GENERATED',
      content: chaosEventContent
    }

    // Save chaos event to database
    const event = await prisma.chaosEvent.create({
      data: {
        gameId,
        type: chaosEvent.type,
        content: chaosEvent.content,
        phase: game.currentPhase,
        day: game.currentDay
      }
    })

    return NextResponse.json({
      event,
      message: 'Chaos event generated successfully'
    })
  } catch (error) {
    console.error('Error generating chaos event:', error)
    return NextResponse.json({ error: 'Failed to generate chaos event' }, { status: 500 })
  }
}
