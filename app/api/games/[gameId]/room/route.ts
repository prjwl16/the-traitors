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
          where: { playerId: player.id },
          orderBy: { name: 'asc' }
        },
        placedItems: {
          where: { playerId: player.id },
          include: {
            roomObject: { select: { name: true } }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
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
      canInteract: obj.lastUpdatedBy !== player.id || obj.state === 'UNTOUCHED'
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
