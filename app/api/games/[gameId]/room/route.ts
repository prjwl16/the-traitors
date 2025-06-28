import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        roomObjects: {
          include: {
            placedItems: {
              include: {
                player: { select: { name: true } }
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        personalItems: {
          where: { playerId },
          orderBy: { name: 'asc' }
        },
        placedItems: {
          where: { playerId },
          include: {
            roomObject: { select: { name: true } }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if player exists in game
    const player = await prisma.player.findFirst({
      where: { id: playerId, gameId }
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found in game' }, { status: 404 })
    }

    // Format room objects with their current state
    const roomObjects = game.roomObjects.map(obj => ({
      id: obj.id,
      name: obj.name,
      description: obj.description,
      state: obj.state,
      lastAction: obj.lastAction,
      placedItems: obj.placedItems.map(item => ({
        itemName: item.itemName,
        playerName: item.player.name
      })),
      canInteract: obj.lastUpdatedBy !== playerId || obj.state === 'UNTOUCHED'
    }))

    // Get player's personal items (excluding already placed ones)
    const placedItemNames = game.placedItems.map(item => item.itemName)
    const availablePersonalItems = game.personalItems.filter(
      item => !placedItemNames.includes(item.name)
    )

    return NextResponse.json({
      game: {
        id: game.id,
        currentPhase: game.currentPhase,
        currentDay: game.currentDay,
        status: game.status
      },
      roomObjects,
      personalItems: availablePersonalItems,
      placedItems: game.placedItems
    })
  } catch (error) {
    console.error('Error fetching room data:', error)
    return NextResponse.json({ error: 'Failed to fetch room data' }, { status: 500 })
  }
}
