import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getAuthUser } from '../../../../lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { gameId } = await params
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          orderBy: { joinedAt: 'asc' }
        },
        votes: {
          where: {
            day: { gte: 1 }
          },
          include: {
            voter: { select: { name: true } },
            target: { select: { name: true } }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if user is a player in this game
    const currentPlayer = game.players.find(p => p.userId === user.id)
    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 })
    }

    // Get current phase votes
    const currentVotes = game.votes.filter(
      vote => vote.phase === game.currentPhase && vote.day === game.currentDay
    )

    // Count votes for current phase
    const voteCount = currentVotes.reduce((acc, vote) => {
      acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      id: game.id,
      code: game.code,
      hostId: game.hostId,
      status: game.status,
      currentPhase: game.currentPhase,
      currentDay: game.currentDay,
      currentPlayerId: currentPlayer.id, // Add current player ID for frontend
      players: game.players.map(player => ({
        id: player.id,
        name: player.name,
        isAlive: player.isAlive,
        isHost: player.isHost,
        userId: player.userId, // Include userId for admin panel access control
        // Only show role to the player themselves or if game is ended
        role: (player.id === currentPlayer.id || game.status === 'ENDED') ? player.role : undefined
      })),
      currentVotes: voteCount,
      hasVoted: currentVotes.map(vote => vote.voterId)
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
