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

    // Check if the user is the host of this game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { userId: user.id, isHost: true }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.players.length === 0) {
      return NextResponse.json({ error: 'You are not the host of this game' }, { status: 403 })
    }

    // Get pending join requests
    const joinRequests = await prisma.joinRequest.findMany({
      where: {
        gameId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const formattedRequests = joinRequests.map(request => ({
      id: request.id,
      playerName: request.playerName,
      userEmail: request.user.email,
      createdAt: request.createdAt
    }))

    return NextResponse.json({
      requests: formattedRequests,
      total: formattedRequests.length
    })
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Failed to fetch join requests' }, { status: 500 })
  }
}
