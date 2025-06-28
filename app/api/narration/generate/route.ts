import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { generateNarration, GameContext } from '../../../../lib/openaiClient'


export async function POST(request: NextRequest) {
  try {
    const { gameId, hostId } = await request.json()
    
    if (!gameId || !hostId) {
      return NextResponse.json({ error: 'Game ID and Host ID are required' }, { status: 400 })
    }

    // Get game data with all related information
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        votes: {
          where: {
            day: { gte: 1 }
          }
        },
        narrations: true
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.hostId !== hostId) {
      return NextResponse.json({ error: 'Only the host can generate narrations' }, { status: 403 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game must be in progress' }, { status: 400 })
    }

    // Check if narration already exists for current phase/day
    const existingNarration = game.narrations.find(
      n => n.phase === game.currentPhase && n.day === game.currentDay
    )

    if (existingNarration) {
      return NextResponse.json({ 
        narration: existingNarration.content,
        message: 'Narration already exists for this phase'
      })
    }

    // Get current game state for narration context
    const alivePlayers = game.players.filter(p => p.isAlive)
    const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR').length
    const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL').length
    
    // Get the most recently eliminated player (if any)
    const recentVotes = game.votes.filter(
      vote => vote.day === game.currentDay - (game.currentPhase === 'DAY' ? 1 : 0)
    )
    
    let eliminatedPlayer = null
    if (recentVotes.length > 0) {
      const voteCount = recentVotes.reduce((acc, vote) => {
        acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const maxVotes = Math.max(...Object.values(voteCount))
      const eliminatedId = Object.entries(voteCount)
        .find(([_, votes]) => votes === maxVotes)?.[0]
      
      if (eliminatedId) {
        eliminatedPlayer = game.players.find(p => p.id === eliminatedId)
      }
    }

    const gameState = {
      phase: game.currentPhase,
      day: game.currentDay,
      alivePlayers: alivePlayers.length,
      aliveTraitors,
      aliveFaithfuls,
      eliminatedPlayer
    }

    // Generate narration using OpenAI
    const gameContext: GameContext = {
      gameId,
      currentPhase: game.currentPhase,
      currentDay: game.currentDay,
      playerCount: game.players.length,
      alivePlayerCount: alivePlayers.length,
      recentEvent: gameState.eliminatedPlayer ? `${gameState.eliminatedPlayer} was eliminated` : undefined
    }

    const narrationContent = await generateNarration(gameContext)

    // Save narration to database
    const narration = await prisma.narration.create({
      data: {
        gameId,
        phase: game.currentPhase,
        day: game.currentDay,
        content: narrationContent
      }
    })

    return NextResponse.json({
      narration: narration.content,
      message: 'Narration generated successfully'
    })
  } catch (error) {
    console.error('Error generating narration:', error)
    return NextResponse.json({ error: 'Failed to generate narration' }, { status: 500 })
  }
}
