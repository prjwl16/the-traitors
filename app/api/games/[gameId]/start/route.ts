import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { validateAuthenticatedGameAccess, validateGameStart } from '../../../../../lib/gameValidation'

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { hostId } = await request.json()
    const { gameId } = await params
    
    // Validate authenticated game access and requirements
    const { game } = await validateAuthenticatedGameAccess(request, gameId, hostId, {
      requireHost: true,
      allowedStatuses: ['WAITING']
    })

    // Validate player count and game balance
    validateGameStart(game.players)

    // Assign roles: 1/3 traitors, 2/3 faithfuls (minimum 1 traitor)
    const playerCount = game.players.length
    const traitorCount = Math.max(1, Math.floor(playerCount / 3))
    
    const shuffledPlayers = shuffleArray(game.players)
    const roleAssignments = [
      ...Array(traitorCount).fill('TRAITOR'),
      ...Array(playerCount - traitorCount).fill('FAITHFUL')
    ]

    // Update players with roles and game status
    await prisma.$transaction([
      // Update game status
      prisma.game.update({
        where: { id: gameId },
        data: { 
          status: 'PLAYING',
          currentPhase: 'DAY',
          currentDay: 1
        }
      }),
      // Assign roles to players
      ...shuffledPlayers.map((player: any, index) =>
        prisma.player.update({
          where: { id: player.id },
          data: { role: roleAssignments[index] as 'TRAITOR' | 'FAITHFUL' }
        })
      )
    ])

    // Initialize Room of Secrets
    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/games/${gameId}/room/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId })
      })
    } catch (err) {
      console.error('Error initializing room:', err)
      // Don't fail the game start if room initialization fails
    }

    return NextResponse.json({
      success: true,
      message: 'Game started successfully',
      traitorCount,
      faithfulCount: playerCount - traitorCount
    })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
}
