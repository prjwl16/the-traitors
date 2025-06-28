import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { validateGameAccess, processVoteElimination, checkWinConditions, withGameLock } from '../../../../../lib/gameValidation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { hostId } = await request.json()
    const { gameId } = await params

    if (!hostId) {
      return NextResponse.json({ error: 'Host ID is required' }, { status: 400 })
    }

    return await withGameLock(gameId, async () => {
      // Validate game access and host permissions
      const { game } = await validateGameAccess(gameId, hostId, {
        requireHost: true,
        allowedStatuses: ['PLAYING']
      })

      // Get current phase votes
      const currentVotes = game.votes.filter(
        (vote: any) => vote.phase === game.currentPhase && vote.day === game.currentDay
      )

      // Process vote elimination with tie-breaking
      const { eliminatedPlayerId, voteCount, tieOccurred } = processVoteElimination(currentVotes)

      if (tieOccurred && eliminatedPlayerId) {
        console.log(`Vote tie resolved randomly in favor of eliminating player ${eliminatedPlayerId}`)
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

      // Check win conditions BEFORE updating database
      const playersAfterElimination = game.players.map((p: any) =>
        p.id === eliminatedPlayerId ? { ...p, isAlive: false } : p
      )
      const { ended: gameEnded, winner } = checkWinConditions(playersAfterElimination)

      // Update game state and end game if needed
      if (gameEnded) {
        updates.push(
          prisma.game.update({
            where: { id: gameId },
            data: {
              status: 'ENDED',
              winner: winner,
              endedAt: new Date()
            }
          })
        )
      }

      await prisma.$transaction(updates)

      return NextResponse.json({
        success: true,
        nextPhase,
        nextDay,
        eliminatedPlayerId,
        gameEnded,
        winner,
        tieOccurred
      })
    })

  } catch (error) {
    console.error('Error advancing phase:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to advance phase'
    }, { status: 500 })
  }
}
