import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
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
      players: game.players.map(player => ({
        id: player.id,
        name: player.name,
        isAlive: player.isAlive,
        isHost: player.isHost,
        role: player.role // This will be filtered on the frontend based on viewer
      })),
      currentVotes: voteCount,
      hasVoted: currentVotes.map(vote => vote.voterId)
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
