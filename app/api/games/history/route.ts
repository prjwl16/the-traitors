import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { getAuthUser } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get all games where the user was a player
    const games = await prisma.game.findMany({
      where: {
        players: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            isHost: true,
            isAlive: true,
            role: true,
            userId: true
          }
        },
        _count: {
          select: {
            votes: true,
            whispers: true,
            narrations: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Format the response
    const gameHistory = games.map(game => {
      const currentUserPlayer = game.players.find(p => p.userId === user.id)
      const playerCount = game.players.length
      const aliveCount = game.players.filter(p => p.isAlive).length
      
      return {
        id: game.id,
        code: game.code,
        status: game.status,
        currentPhase: game.currentPhase,
        currentDay: game.currentDay,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        endedAt: game.endedAt,
        winner: game.winner,
        playerCount,
        aliveCount,
        isHost: currentUserPlayer?.isHost || false,
        playerName: currentUserPlayer?.name,
        playerRole: currentUserPlayer?.role,
        isPlayerAlive: currentUserPlayer?.isAlive,
        canRejoin: game.status === 'PLAYING' && currentUserPlayer?.isAlive,
        activityCount: {
          votes: game._count.votes,
          whispers: game._count.whispers,
          narrations: game._count.narrations
        }
      }
    })

    return NextResponse.json({
      games: gameHistory,
      total: gameHistory.length
    })
  } catch (error) {
    console.error('Error fetching game history:', error)
    return NextResponse.json({ error: 'Failed to fetch game history' }, { status: 500 })
  }
}
