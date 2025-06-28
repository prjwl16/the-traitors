import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { generateMission, GameContext, PlayerContext } from '../../../../lib/openaiClient'


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
        playerMissions: true
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can generate missions' }, { status: 403 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game must be in progress' }, { status: 400 })
    }

    const alivePlayers = game.players.filter(p => p.isAlive && p.role)
    
    // Check if missions already exist for current phase/day
    const existingMissions = game.playerMissions.filter(
      m => m.phase === game.currentPhase && m.day === game.currentDay
    )

    if (existingMissions.length > 0) {
      return NextResponse.json({ 
        message: 'Missions already exist for this phase',
        missionsGenerated: existingMissions.length
      })
    }

    const missionsToCreate = []

    // Generate missions for each alive player using OpenAI
    const gameContext: GameContext = {
      gameId,
      currentPhase: game.currentPhase,
      currentDay: game.currentDay,
      playerCount: game.players.length,
      alivePlayerCount: alivePlayers.length
    }

    for (const player of alivePlayers) {
      const playerContext: PlayerContext = {
        name: player.name,
        role: player.role!,
        isAlive: player.isAlive
      }

      const missionContent = await generateMission(gameContext, playerContext)

      missionsToCreate.push({
        gameId,
        playerId: player.id,
        phase: game.currentPhase,
        day: game.currentDay,
        content: missionContent
      })
    }

    // Create all missions in a transaction
    await prisma.playerMission.createMany({
      data: missionsToCreate
    })

    return NextResponse.json({
      message: 'Missions generated successfully',
      missionsGenerated: missionsToCreate.length,
      phase: game.currentPhase,
      day: game.currentDay
    })
  } catch (error) {
    console.error('Error generating missions:', error)
    return NextResponse.json({ error: 'Failed to generate missions' }, { status: 500 })
  }
}
