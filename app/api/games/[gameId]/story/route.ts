import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getAuthUser } from '../../../../../lib/auth'

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

    // Verify user is a player in this game
    const player = await prisma.player.findFirst({
      where: {
        gameId,
        userId: user.id
      }
    })

    if (!player) {
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 })
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        narrations: {
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' }
          ]
        },
        chaosEvents: {
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' }
          ]
        },
        votes: {
          include: {
            voter: { select: { name: true } },
            target: { select: { name: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Build story events timeline
    const events: any[] = []

    // Group votes by phase and day to find eliminations
    const votesByPhaseDay = game.votes.reduce((acc, vote) => {
      const key = `${vote.day}-${vote.phase}`
      if (!acc[key]) acc[key] = []
      acc[key].push(vote)
      return acc
    }, {} as Record<string, any[]>)

    // Process each day/phase combination
    const processedPhases = new Set<string>()

    for (const narration of game.narrations) {
      const phaseKey = `${narration.day}-${narration.phase}`

      if (!processedPhases.has(phaseKey)) {
        processedPhases.add(phaseKey)

        // Add narration event
        events.push({
          type: 'narration',
          phase: narration.phase,
          day: narration.day,
          content: narration.content,
          timestamp: narration.createdAt.toISOString()
        })

        // Add chaos event if exists for this phase
        const chaosEvent = game.chaosEvents.find(
          e => e.phase === narration.phase && e.day === narration.day
        )

        if (chaosEvent) {
          events.push({
            type: 'chaos_event',
            phase: chaosEvent.phase,
            day: chaosEvent.day,
            content: chaosEvent.content,
            timestamp: chaosEvent.createdAt.toISOString(),
            eventType: chaosEvent.type
          })
        }

        // Check for eliminations in this phase
        const phaseVotes = votesByPhaseDay[phaseKey] || []
        if (phaseVotes.length > 0) {
          // Count votes for each target
          const voteCount = phaseVotes.reduce((acc, vote) => {
            acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          // Find player with most votes
          const maxVotes = Math.max(...(Object.values(voteCount) as number[]))
          const eliminatedId = Object.entries(voteCount)
            .find(([_, votes]) => votes === maxVotes)?.[0]

          if (eliminatedId) {
            const eliminatedPlayer = game.players.find(p => p.id === eliminatedId)
            if (eliminatedPlayer) {
              const eliminationType = narration.phase === 'DAY' ? 'banished' : 'killed'
              const actionText = narration.phase === 'DAY' 
                ? `The group voted to banish ${eliminatedPlayer.name} from the castle.`
                : `${eliminatedPlayer.name} was found dead at dawn, another victim of the traitors' dark work.`

              events.push({
                type: 'elimination',
                phase: narration.phase,
                day: narration.day,
                content: actionText,
                timestamp: narration.createdAt.toISOString(),
                playerName: eliminatedPlayer.name,
                playerRole: eliminatedPlayer.role,
                eliminationType
              })
            }
          }
        }
      }
    }

    // Sort events by day, then by phase (DAY before NIGHT), then by type
    events.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      if (a.phase !== b.phase) return a.phase === 'DAY' ? -1 : 1
      if (a.type !== b.type) {
        // Narration first, then elimination
        if (a.type === 'narration' && b.type === 'elimination') return -1
        if (a.type === 'elimination' && b.type === 'narration') return 1
      }
      return 0
    })

    return NextResponse.json({
      game: {
        id: game.id,
        status: game.status,
        currentPhase: game.currentPhase,
        currentDay: game.currentDay
      },
      events
    })
  } catch (error) {
    console.error('Error fetching story:', error)
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 })
  }
}
