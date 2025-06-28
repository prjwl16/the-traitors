import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Generate a 6-character game code
function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { hostName } = await request.json()
    
    if (!hostName || hostName.trim().length === 0) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 })
    }

    // Generate unique game code
    let gameCode: string
    let attempts = 0
    do {
      gameCode = generateGameCode()
      const existingGame = await prisma.game.findUnique({
        where: { code: gameCode }
      })
      if (!existingGame) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Failed to generate unique game code' }, { status: 500 })
    }

    const hostId = uuidv4()

    // Create game and host player in a transaction
    const game = await prisma.game.create({
      data: {
        code: gameCode,
        hostId: hostId,
        players: {
          create: {
            id: hostId,
            name: hostName.trim(),
            isHost: true
          }
        }
      },
      include: {
        players: true
      }
    })

    return NextResponse.json({
      gameId: game.id,
      gameCode: game.code,
      hostId: hostId
    })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}
