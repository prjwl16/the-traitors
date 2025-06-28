import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { validateAuthenticatedGameAccess, validateVotingPermissions } from '../../../../../lib/gameValidation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { voterId, targetId } = await request.json()
    const { gameId } = await params

    if (!voterId || !targetId) {
      return NextResponse.json({ error: 'Voter ID and target ID are required' }, { status: 400 })
    }

    // Validate authenticated game access and voter permissions
    const { game, player: voter } = await validateAuthenticatedGameAccess(request, gameId, voterId, {
      requireAlive: true,
      allowedStatuses: ['PLAYING']
    })

    // Find target player
    const target = game.players.find((p: any) => p.id === targetId)
    if (!target) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 400 })
    }

    // Validate voting permissions
    validateVotingPermissions(voter, target, game.currentPhase)

    // Check if player has already voted in this phase/day
    const existingVote = game.votes.find(
      (vote: any) => vote.voterId === voterId &&
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
