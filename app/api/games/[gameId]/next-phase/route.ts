import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { hostId } = await request.json()
    const { gameId } = await params
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { 
        players: true,
        votes: {
          where: {
            phase: { in: ['DAY', 'NIGHT'] },
            day: { gte: 1 }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can advance phases' }, { status: 403 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game is not in progress' }, { status: 400 })
    }

    // Get current phase votes
    const currentVotes = game.votes.filter(
      vote => vote.phase === game.currentPhase && vote.day === game.currentDay
    )

    // Count votes and find the player with most votes
    const voteCount = currentVotes.reduce((acc, vote) => {
      acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let eliminatedPlayerId: string | null = null
    
    if (Object.keys(voteCount).length > 0) {
      // Find player with most votes (simple majority, no tie-breaking for now)
      const maxVotes = Math.max(...Object.values(voteCount))
      const playersWithMaxVotes = Object.entries(voteCount)
        .filter(([_, votes]) => votes === maxVotes)
        .map(([playerId, _]) => playerId)
      
      // If there's a clear winner (no tie), eliminate them
      if (playersWithMaxVotes.length === 1) {
        eliminatedPlayerId = playersWithMaxVotes[0]
      }
    }

    // Determine next phase
    let nextPhase: 'DAY' | 'NIGHT'
    let nextDay = game.currentDay

    if (game.currentPhase === 'DAY') {
      nextPhase = 'NIGHT'
    } else {
      nextPhase = 'DAY'
      nextDay += 1
    }

    // Update game and eliminate player if needed
    const updates: any[] = [
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentPhase: nextPhase,
          currentDay: nextDay
        }
      })
    ]

    if (eliminatedPlayerId) {
      updates.push(
        prisma.player.update({
          where: { id: eliminatedPlayerId },
          data: { isAlive: false }
        })
      )
    }

    await prisma.$transaction(updates)

    // Check win conditions
    const alivePlayers = game.players.filter(p => p.isAlive && p.id !== eliminatedPlayerId)
    const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR').length
    const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL').length

    let gameEnded = false
    let winner: string | null = null

    if (aliveTraitors === 0) {
      winner = 'FAITHFULS'
      gameEnded = true
    } else if (aliveTraitors >= aliveFaithfuls) {
      winner = 'TRAITORS'
      gameEnded = true
    }

    if (gameEnded) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'ENDED' }
      })
    }

    return NextResponse.json({ 
      success: true,
      nextPhase,
      nextDay,
      eliminatedPlayerId,
      gameEnded,
      winner
    })
  } catch (error) {
    console.error('Error advancing phase:', error)
    return NextResponse.json({ error: 'Failed to advance phase' }, { status: 500 })
  }
}
