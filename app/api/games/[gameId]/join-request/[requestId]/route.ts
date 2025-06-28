import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'
import { getAuthUser } from '../../../../../../lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; requestId: string }> }
) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { gameId, requestId } = await params
    const { action } = await request.json() // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "reject"' }, { status: 400 })
    }

    // Get the join request with game and user info
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        game: {
          include: {
            players: true
          }
        },
        user: true
      }
    })

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    if (joinRequest.gameId !== gameId) {
      return NextResponse.json({ error: 'Join request does not belong to this game' }, { status: 400 })
    }

    // Check if the current user is the host of the game
    const isHost = joinRequest.game.players.some(p => p.userId === user.id && p.isHost)
    if (!isHost) {
      return NextResponse.json({ error: 'Only the game host can manage join requests' }, { status: 403 })
    }

    // Check if the request is still pending
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 })
    }

    // Check if game is still waiting
    if (joinRequest.game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
    }

    if (action === 'accept') {
      // Check if game is full
      if (joinRequest.game.players.length >= 12) {
        return NextResponse.json({ error: 'Game is full' }, { status: 400 })
      }

      // Check if player name is already taken
      const nameExists = joinRequest.game.players.some(p => 
        p.name.toLowerCase() === joinRequest.playerName.toLowerCase()
      )
      if (nameExists) {
        return NextResponse.json({ 
          error: 'Player name is already taken in this game' 
        }, { status: 400 })
      }

      // Accept the request: create player and update request status
      const playerId = uuidv4()
      
      await prisma.$transaction([
        // Create the player
        prisma.player.create({
          data: {
            id: playerId,
            name: joinRequest.playerName,
            gameId: joinRequest.gameId,
            userId: joinRequest.userId,
            isHost: false
          }
        }),
        // Update the join request status
        prisma.joinRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        })
      ])

      return NextResponse.json({
        success: true,
        message: 'Join request accepted',
        playerId
      })
    } else {
      // Reject the request
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })

      return NextResponse.json({
        success: true,
        message: 'Join request rejected'
      })
    }
  } catch (error) {
    console.error('Error managing join request:', error)
    return NextResponse.json({ error: 'Failed to process join request' }, { status: 500 })
  }
}
