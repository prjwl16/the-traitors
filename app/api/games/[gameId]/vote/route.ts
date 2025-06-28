import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { voterId, targetId } = await request.json()
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

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game is not in progress' }, { status: 400 })
    }

    const voter = game.players.find(p => p.id === voterId)
    const target = game.players.find(p => p.id === targetId)

    if (!voter || !target) {
      return NextResponse.json({ error: 'Invalid voter or target' }, { status: 400 })
    }

    if (!voter.isAlive) {
      return NextResponse.json({ error: 'Dead players cannot vote' }, { status: 400 })
    }

    if (!target.isAlive) {
      return NextResponse.json({ error: 'Cannot vote for dead players' }, { status: 400 })
    }

    // Check voting permissions based on phase
    if (game.currentPhase === 'NIGHT' && voter.role !== 'TRAITOR') {
      return NextResponse.json({ error: 'Only traitors can vote during night phase' }, { status: 403 })
    }

    // Check if player has already voted in this phase/day
    const existingVote = game.votes.find(
      vote => vote.voterId === voterId && 
               vote.phase === game.currentPhase && 
               vote.day === game.currentDay
    )

    if (existingVote) {
      // Update existing vote
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { targetId }
      })
    } else {
      // Create new vote
      await prisma.vote.create({
        data: {
          gameId,
          voterId,
          targetId,
          phase: game.currentPhase,
          day: game.currentDay
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}
