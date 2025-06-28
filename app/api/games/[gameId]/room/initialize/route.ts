import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'
import { ROOM_OBJECTS, getRandomPersonalItems } from '../../../../../../lib/room-objects'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { hostId } = await request.json()
    
    if (!hostId) {
      return NextResponse.json({ error: 'Host ID is required' }, { status: 400 })
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { 
        players: true,
        roomObjects: true,
        personalItems: true
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can initialize the room' }, { status: 403 })
    }

    // Check if room is already initialized
    if (game.roomObjects.length > 0) {
      return NextResponse.json({ 
        message: 'Room already initialized',
        objectCount: game.roomObjects.length,
        personalItemCount: game.personalItems.length
      })
    }

    // Create room objects
    const roomObjectsData = ROOM_OBJECTS.map(obj => ({
      gameId,
      name: obj.name,
      description: obj.description
    }))

    // Create personal items for each player
    const personalItemsData = []
    for (const player of game.players) {
      const playerItems = getRandomPersonalItems(4)
      for (const itemName of playerItems) {
        personalItemsData.push({
          gameId,
          playerId: player.id,
          name: itemName
        })
      }
    }

    // Create everything in a transaction
    await prisma.$transaction([
      prisma.roomObject.createMany({
        data: roomObjectsData
      }),
      prisma.personalItem.createMany({
        data: personalItemsData
      })
    ])

    return NextResponse.json({
      message: 'Room initialized successfully',
      objectCount: roomObjectsData.length,
      personalItemCount: personalItemsData.length
    })
  } catch (error) {
    console.error('Error initializing room:', error)
    return NextResponse.json({ error: 'Failed to initialize room' }, { status: 500 })
  }
}
