import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

// This endpoint can be called periodically to check for auto-phase progression
export async function POST(request: NextRequest) {
  try {
    // Find all games with auto-phase enabled
    const games = await prisma.game.findMany({
      where: {
        status: 'PLAYING',
        autoPhaseEnabled: true,
        phaseStartTime: { not: null }
      },
      include: {
        players: true,
        votes: true
      }
    })

    const results = []

    for (const game of games) {
      if (!game.phaseStartTime) continue

      const phaseEndTime = new Date(
        game.phaseStartTime.getTime() + (game.phaseDurationHours * 60 * 60 * 1000)
      )
      const now = new Date()

      // Check if phase should advance
      if (now >= phaseEndTime) {
        try {
          // Process current phase votes and advance
          const currentVotes = game.votes.filter(
            vote => vote.phase === game.currentPhase && vote.day === game.currentDay
          )

          // Count votes and find elimination
          const voteCount = currentVotes.reduce((acc, vote) => {
            acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          let eliminatedPlayerId: string | null = null

          if (Object.keys(voteCount).length > 0) {
            const maxVotes = Math.max(...Object.values(voteCount))
            const playersWithMaxVotes = Object.entries(voteCount)
              .filter(([_, votes]) => votes === maxVotes)
              .map(([playerId, _]) => playerId)

            // Handle elimination (including ties)
            if (playersWithMaxVotes.length === 1) {
              // Clear winner
              eliminatedPlayerId = playersWithMaxVotes[0]
            } else if (playersWithMaxVotes.length > 1) {
              // Tie-breaking: Random selection
              const randomIndex = Math.floor(Math.random() * playersWithMaxVotes.length)
              eliminatedPlayerId = playersWithMaxVotes[randomIndex]
              console.log(`Auto-phase vote tie broken randomly: ${playersWithMaxVotes.length} players tied, selected ${eliminatedPlayerId}`)
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
              where: { id: game.id },
              data: {
                currentPhase: nextPhase,
                currentDay: nextDay,
                phaseStartTime: new Date() // Reset phase timer
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

          // Update game state and end game if needed
          if (gameEnded) {
            updates.push(
              prisma.game.update({
                where: { id: game.id },
                data: {
                  status: 'ENDED',
                  winner: winner,
                  endedAt: new Date(),
                  autoPhaseEnabled: false
                }
              })
            )
          }

          await prisma.$transaction(updates)

          // Auto-generate narration and missions for new phase
          if (!gameEnded) {
            try {
              // Generate narration
              const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
              await fetch(`${baseUrl}/api/narration/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id, hostId: game.hostId })
              })

              // Generate missions
              await fetch(`${baseUrl}/api/missions/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: game.id, hostId: game.hostId })
              })
            } catch (err) {
              console.error('Error auto-generating content:', err)
            }
          }

          results.push({
            gameId: game.id,
            gameCode: game.code,
            action: 'phase_advanced',
            fromPhase: game.currentPhase,
            toPhase: nextPhase,
            day: nextDay,
            eliminatedPlayerId,
            gameEnded,
            winner
          })
        } catch (err) {
          console.error(`Error advancing phase for game ${game.id}:`, err)
          results.push({
            gameId: game.id,
            gameCode: game.code,
            action: 'error',
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      } else {
        results.push({
          gameId: game.id,
          gameCode: game.code,
          action: 'no_action',
          timeRemaining: phaseEndTime.getTime() - now.getTime()
        })
      }
    }

    return NextResponse.json({
      message: 'Auto-phase check completed',
      gamesChecked: games.length,
      results
    })
  } catch (error) {
    console.error('Error in auto-phase check:', error)
    return NextResponse.json({ error: 'Failed to check auto-phase' }, { status: 500 })
  }
}
