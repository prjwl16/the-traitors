import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'
import { generateRoomInteractionLog, RoomInteractionContext } from '../../../../../../lib/openaiClient'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { playerId, objectId, action, itemName } = await request.json()
    
    if (!playerId || !objectId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    const player = game.players.find(p => p.id === playerId)
    if (!player || !player.isAlive) {
      return NextResponse.json({ error: 'Invalid or dead player' }, { status: 400 })
    }

    const roomObject = await prisma.roomObject.findUnique({
      where: { id: objectId },
      include: { placedItems: true }
    })

    if (!roomObject || roomObject.gameId !== gameId) {
      return NextResponse.json({ error: 'Room object not found' }, { status: 404 })
    }

    // Check if player has already interacted with this object this phase
    if (roomObject.lastUpdatedBy === playerId && roomObject.state !== 'UNTOUCHED') {
      return NextResponse.json({ error: 'You have already interacted with this object this phase' }, { status: 400 })
    }

    let newState = roomObject.state
    let actionDescription = ''
    let logContent = ''

    if (action === 'PLACE' && itemName) {
      // Verify player has this personal item
      const personalItem = await prisma.personalItem.findFirst({
        where: {
          gameId,
          playerId,
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
          playerId,
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
          playerId,
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
          lastUpdatedBy: playerId
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
