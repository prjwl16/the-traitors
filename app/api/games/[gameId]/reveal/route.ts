import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getAuthUser } from '../../../../../lib/auth'

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
          include: {
            voter: { select: { name: true } },
            target: { select: { name: true } }
          },
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' },
            { createdAt: 'asc' }
          ]
        },
        narrations: {
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' }
          ]
        },
        playerMissions: {
          include: {
            player: { select: { name: true } }
          },
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' }
          ]
        },
        whispers: {
          include: {
            fromPlayer: { select: { name: true } },
            toPlayer: { select: { name: true } }
          },
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' },
            { createdAt: 'asc' }
          ]
        },
        chaosEvents: {
          orderBy: [
            { day: 'asc' },
            { phase: 'asc' }
          ]
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check authentication and get user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is a player in this game
    const currentPlayer = game.players.find(p => p.userId === user.id)
    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 })
    }

    // Only allow access to reveal page if game has ended OR if user is the host
    if (game.status !== 'ENDED' && !currentPlayer.isHost) {
      return NextResponse.json({ error: 'Game must be completed to view reveal' }, { status: 400 })
    }

    // Determine winner
    let winner = null
    const alivePlayers = game.players.filter(p => p.isAlive)
    const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR')
    const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL')

    if (aliveTraitors.length === 0) {
      winner = 'FAITHFULS'
    } else if (aliveTraitors.length >= aliveFaithfuls.length) {
      winner = 'TRAITORS'
    }

    // Format missions data
    const missions = game.playerMissions.map(mission => ({
      id: mission.id,
      playerId: mission.playerId,
      playerName: mission.player.name,
      phase: mission.phase,
      day: mission.day,
      content: mission.content,
      completed: mission.completed
    }))

    return NextResponse.json({
      game: {
        id: game.id,
        status: game.status,
        winner
      },
      players: game.players,
      votes: game.votes,
      missions,
      narrations: game.narrations,
      whispers: game.whispers,
      chaosEvents: game.chaosEvents
    })
  } catch (error) {
    console.error('Error fetching reveal data:', error)
    return NextResponse.json({ error: 'Failed to fetch reveal data' }, { status: 500 })
  }
}
