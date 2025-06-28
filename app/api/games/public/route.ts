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

    // Get all public games that are waiting for players
    const publicGames = await prisma.game.findMany({
      where: {
        isPublic: true,
        status: 'WAITING'
      },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            isHost: true,
            userId: true
          }
        },
        joinRequests: {
          where: {
            userId: user.id,
            status: 'PENDING'
          }
        },
        _count: {
          select: {
            players: true,
            joinRequests: {
              where: {
                status: 'PENDING'
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format the response
    const formattedGames = publicGames.map(game => {
      const isAlreadyPlayer = game.players.some(p => p.userId === user.id)
      const hasPendingRequest = game.joinRequests.length > 0
      const isHost = game.players.some(p => p.userId === user.id && p.isHost)

      return {
        id: game.id,
        code: game.code,
        gameName: game.gameName,
        playerCount: game._count.players,
        maxPlayers: 12, // Standard max for Traitors
        createdAt: game.createdAt,
        hostName: game.players.find(p => p.isHost)?.name || 'Unknown',
        canJoin: !isAlreadyPlayer && !hasPendingRequest && game._count.players < 12,
        isAlreadyPlayer,
        hasPendingRequest,
        isHost,
        pendingRequestsCount: game._count.joinRequests
      }
    })

    return NextResponse.json({
      games: formattedGames,
      total: formattedGames.length
    })
  } catch (error) {
    console.error('Error fetching public games:', error)
    return NextResponse.json({ error: 'Failed to fetch public games' }, { status: 500 })
  }
}
