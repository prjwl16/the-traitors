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
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verify the player belongs to the authenticated user
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { game: true }
    })

    if (!player || player.userId !== user.id || player.gameId !== gameId) {
      return NextResponse.json({ error: 'Unauthorized access to player data' }, { status: 403 })
    }

    // Get sent whispers
    const sentWhispers = await prisma.whisper.findMany({
      where: {
        gameId,
        fromPlayerId: playerId
      },
      include: {
        toPlayer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get received whispers
    const receivedWhispers = await prisma.whisper.findMany({
      where: {
        gameId,
        toPlayerId: playerId
      },
      include: {
        fromPlayer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format the data
    const sent = sentWhispers.map(w => ({
      id: w.id,
      fromPlayerId: w.fromPlayerId,
      toPlayerId: w.toPlayerId,
      toPlayerName: w.toPlayer.name,
      content: w.content,
      phase: w.phase,
      day: w.day,
      isLeaked: w.isLeaked,
      createdAt: w.createdAt.toISOString()
    }))

    const received = receivedWhispers.map(w => ({
      id: w.id,
      fromPlayerId: w.fromPlayerId,
      fromPlayerName: w.isLeaked ? w.fromPlayer.name : undefined, // Only show sender if leaked
      toPlayerId: w.toPlayerId,
      content: w.content,
      phase: w.phase,
      day: w.day,
      isLeaked: w.isLeaked,
      createdAt: w.createdAt.toISOString()
    }))

    return NextResponse.json({ sent, received })
  } catch (error) {
    console.error('Error fetching whispers:', error)
    return NextResponse.json({ error: 'Failed to fetch whispers' }, { status: 500 })
  }
}

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
    const { fromPlayerId, toPlayerId, content } = await request.json()

    if (!fromPlayerId || !toPlayerId || !content?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Verify the sender belongs to the authenticated user
    const senderPlayer = await prisma.player.findUnique({
      where: { id: fromPlayerId }
    })

    if (!senderPlayer || senderPlayer.userId !== user.id || senderPlayer.gameId !== gameId) {
      return NextResponse.json({ error: 'Unauthorized to send whisper as this player' }, { status: 403 })
    }

    if (content.length > 140) {
      return NextResponse.json({ error: 'Message too long (max 140 characters)' }, { status: 400 })
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

    // Verify both players exist and are alive
    const fromPlayer = game.players.find(p => p.id === fromPlayerId)
    const toPlayer = game.players.find(p => p.id === toPlayerId)

    if (!fromPlayer || !toPlayer) {
      return NextResponse.json({ error: 'Invalid players' }, { status: 400 })
    }

    if (!fromPlayer.isAlive || !toPlayer.isAlive) {
      return NextResponse.json({ error: 'Dead players cannot send or receive whispers' }, { status: 400 })
    }

    if (fromPlayerId === toPlayerId) {
      return NextResponse.json({ error: 'Cannot send whisper to yourself' }, { status: 400 })
    }

    // Check if player has already sent a whisper this phase
    const existingWhisper = await prisma.whisper.findUnique({
      where: {
        gameId_fromPlayerId_phase_day: {
          gameId,
          fromPlayerId,
          phase: game.currentPhase,
          day: game.currentDay
        }
      }
    })

    if (existingWhisper) {
      return NextResponse.json({ error: 'You can only send one whisper per phase' }, { status: 400 })
    }

    // Create whisper
    const whisper = await prisma.whisper.create({
      data: {
        gameId,
        fromPlayerId,
        toPlayerId,
        content: content.trim(),
        phase: game.currentPhase,
        day: game.currentDay
      }
    })

    return NextResponse.json({ 
      whisper,
      message: 'Whisper sent successfully'
    })
  } catch (error) {
    console.error('Error sending whisper:', error)
    return NextResponse.json({ error: 'Failed to send whisper' }, { status: 500 })
  }
}
