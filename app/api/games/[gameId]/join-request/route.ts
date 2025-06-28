import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'
import { getAuthUser } from '../../../../../lib/auth'

export async function POST(
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
    const { playerName } = await request.json()

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    // Check if game exists and is public
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        joinRequests: {
          where: { userId: user.id }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (!game.isPublic) {
      return NextResponse.json({ error: 'This game is not public' }, { status: 400 })
    }

    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
    }

    // Check if user is already a player
    const isAlreadyPlayer = game.players.some(p => p.userId === user.id)
    if (isAlreadyPlayer) {
      return NextResponse.json({ error: 'You are already a player in this game' }, { status: 400 })
    }

    // Check if user already has a pending request
    const existingRequest = game.joinRequests.find(r => r.status === 'PENDING')
    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this game' }, { status: 400 })
    }

    // Check if game is full
    if (game.players.length >= 12) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 })
    }

    // Create join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        gameId,
        userId: user.id,
        playerName: playerName.trim(),
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Join request sent successfully',
      requestId: joinRequest.id
    })
  } catch (error) {
    console.error('Error creating join request:', error)
    return NextResponse.json({ error: 'Failed to create join request' }, { status: 500 })
  }
}
