import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'
import { generateRoomInteractionLog, RoomInteractionContext } from '../../../../../../lib/openaiClient'
import { validateAuthenticatedGameAccess, validateRoomInteraction } from '../../../../../../lib/gameValidation'
import { getAuthUser } from '../../../../../../lib/auth'

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
    const { objectId, action, itemName } = await request.json()

    if (!objectId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the player for this user in this game
    const player = await prisma.player.findFirst({
      where: {
        gameId,
        userId: user.id
      }
    })

    if (!player) {
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 })
    }

    // Get game data
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game must be in progress' }, { status: 400 })
    }

    if (!player.isAlive) {
      return NextResponse.json({ error: 'Dead players cannot interact with room objects' }, { status: 400 })
    }

    const roomObject = await prisma.roomObject.findUnique({
      where: { id: objectId },
      include: { placedItems: true }
    })

    if (!roomObject || roomObject.gameId !== gameId) {
      return NextResponse.json({ error: 'Room object not found' }, { status: 404 })
    }

    // Validate room interaction permissions
    validateRoomInteraction(player, roomObject, action, itemName)

    let newState = roomObject.state
    let actionDescription = ''
    let logContent = ''

    if (action === 'PLACE' && itemName) {
      // Verify player has this personal item
      const personalItem = await prisma.personalItem.findFirst({
        where: {
          gameId,
          playerId: player.id,
          name: itemName
        }
      })

      if (!personalItem) {
        return NextResponse.json({ error: 'You do not have this personal item' }, { status: 400 })
      }

      // Check if item is already placed
      const existingPlacement = await prisma.placedItem.findFirst({
        where: {
          gameId,
          playerId: player.id,
          itemName
        }
      })

      if (existingPlacement) {
        return NextResponse.json({ error: 'This item has already been placed' }, { status: 400 })
      }

      // Place the item
      await prisma.placedItem.create({
        data: {
          gameId,
          playerId: player.id,
          itemName,
          objectId,
          phase: game.currentPhase,
          day: game.currentDay
        }
      })

      newState = 'PLACED'
      actionDescription = 'PLACE'
    } else {
      // Handle other actions
      switch (action) {
        case 'DESTROY':
          newState = 'DESTROYED'
          actionDescription = 'DESTROY'
          break
        case 'CLEAN':
          newState = 'CLEANED'
          actionDescription = 'CLEAN'
          break
        case 'VISIT':
          newState = 'VISITED'
          actionDescription = 'VISIT'
          break
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    }

    // Generate AI-powered room interaction log
    const interactionContext: RoomInteractionContext = {
      action: action as 'DESTROY' | 'CLEAN' | 'PLACE' | 'VISIT',
      objectName: roomObject.name,
      itemName: action === 'PLACE' ? itemName : undefined,
      playerName: player.name
    }

    logContent = await generateRoomInteractionLog(interactionContext)

    // Update room object and create log entry
    await prisma.$transaction([
      prisma.roomObject.update({
        where: { id: objectId },
        data: {
          state: newState,
          lastAction: actionDescription,
          lastUpdatedBy: player.id
        }
      }),
      prisma.roomLog.create({
        data: {
          gameId,
          content: logContent,
          phase: game.currentPhase,
          day: game.currentDay
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Interaction completed successfully',
      newState,
      logContent
    })
  } catch (error) {
    console.error('Error processing room interaction:', error)
    return NextResponse.json({ error: 'Failed to process interaction' }, { status: 500 })
  }
}
