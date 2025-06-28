import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { playerName, gameCode } = await request.json()
    
    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    if (!gameCode || gameCode.trim().length === 0) {
      return NextResponse.json({ error: 'Game code is required' }, { status: 400 })
    }

    // Find the game
    const game = await prisma.game.findUnique({
      where: { code: gameCode.toUpperCase() },
      include: { players: true }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
    }

    // Check if player name is already taken in this game
    const existingPlayer = game.players.find(
      p => p.name.toLowerCase() === playerName.trim().toLowerCase()
    )
    
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player name already taken' }, { status: 400 })
    }

    // Check player limit (8-12 players)
    if (game.players.length >= 12) {
      return NextResponse.json({ error: 'Game is full (max 12 players)' }, { status: 400 })
    }

    const playerId = uuidv4()

    // Add player to game
    const player = await prisma.player.create({
      data: {
        id: playerId,
        name: playerName.trim(),
        gameId: game.id,
        isHost: false
      }
    })

    return NextResponse.json({
      gameId: game.id,
      playerId: playerId,
      playerName: player.name
    })
  } catch (error) {
    console.error('Error joining game:', error)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }
}
