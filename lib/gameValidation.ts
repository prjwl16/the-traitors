import { prisma } from './db'
import { getAuthUser } from './auth'
import { NextRequest } from 'next/server'

export interface GameValidationResult {
  game: any
  player: any
}

export interface WinConditionResult {
  ended: boolean
  winner: 'FAITHFULS' | 'TRAITORS' | null
}

/**
 * Comprehensive game and player validation
 */
export async function validateGameAccess(
  gameId: string, 
  playerId: string,
  options: {
    requireAlive?: boolean
    requireHost?: boolean
    allowedStatuses?: ('WAITING' | 'PLAYING' | 'ENDED')[]
  } = {}
): Promise<GameValidationResult> {
  const { requireAlive = false, requireHost = false, allowedStatuses = ['PLAYING'] } = options

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { 
      players: true,
      votes: true,
      roomObjects: true,
      personalItems: true
    }
  })

  if (!game) {
    throw new Error('Game not found')
  }

  if (!allowedStatuses.includes(game.status as any)) {
    throw new Error(`Game is not in valid status. Current: ${game.status}, Required: ${allowedStatuses.join(', ')}`)
  }

  const player = game.players.find(p => p.id === playerId)
  if (!player) {
    throw new Error('Player not found in this game')
  }

  if (requireAlive && !player.isAlive) {
    throw new Error('Dead players cannot perform this action')
  }

  if (requireHost && !player.isHost) {
    throw new Error('Only the host can perform this action')
  }

  return { game, player }
}

/**
 * Check win conditions for the game
 */
export function checkWinConditions(players: any[]): WinConditionResult {
  const alivePlayers = players.filter(p => p.isAlive)
  const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR').length
  const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL').length

  // Faithfuls win if all traitors are eliminated
  if (aliveTraitors === 0) {
    return { ended: true, winner: 'FAITHFULS' }
  }

  // Traitors win if they equal or outnumber faithfuls
  if (aliveTraitors >= aliveFaithfuls) {
    return { ended: true, winner: 'TRAITORS' }
  }

  // Game continues
  return { ended: false, winner: null }
}

/**
 * Validate minimum player requirements for game start
 */
export function validateGameStart(players: any[]): void {
  if (players.length < 3) {
    throw new Error('Need at least 3 players to start the game')
  }

  if (players.length > 12) {
    throw new Error('Maximum 12 players allowed')
  }

  // Ensure we have at least 1 traitor and 1 faithful
  const traitorCount = Math.max(1, Math.floor(players.length / 3))
  const faithfulCount = players.length - traitorCount

  if (traitorCount === 0 || faithfulCount === 0) {
    throw new Error('Invalid role distribution')
  }

  // Check for immediate traitor victory (shouldn't happen with proper counts)
  if (traitorCount >= faithfulCount) {
    throw new Error('Too many traitors for game balance')
  }
}

/**
 * Validate voting permissions
 */
export function validateVotingPermissions(
  voter: any,
  target: any,
  gamePhase: 'DAY' | 'NIGHT'
): void {
  if (!voter.isAlive) {
    throw new Error('Dead players cannot vote')
  }

  if (!target.isAlive) {
    throw new Error('Cannot vote for dead players')
  }

  if (voter.id === target.id) {
    throw new Error('Cannot vote for yourself')
  }

  // Night phase voting restrictions
  if (gamePhase === 'NIGHT' && voter.role !== 'TRAITOR') {
    throw new Error('Only traitors can vote during night phase')
  }
}

/**
 * Process vote counting with tie-breaking
 */
export function processVoteElimination(votes: any[]): {
  eliminatedPlayerId: string | null
  voteCount: Record<string, number>
  tieOccurred: boolean
} {
  if (votes.length === 0) {
    return {
      eliminatedPlayerId: null,
      voteCount: {},
      tieOccurred: false
    }
  }

  // Count votes
  const voteCount = votes.reduce((acc, vote) => {
    acc[vote.targetId] = (acc[vote.targetId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Find players with most votes
  const maxVotes = Math.max(...(Object.values(voteCount) as number[]))
  const playersWithMaxVotes = Object.entries(voteCount)
    .filter(([_, votes]) => votes === maxVotes)
    .map(([playerId, _]) => playerId)

  let eliminatedPlayerId: string | null = null
  let tieOccurred = false

  if (playersWithMaxVotes.length === 1) {
    // Clear winner
    eliminatedPlayerId = playersWithMaxVotes[0]
  } else if (playersWithMaxVotes.length > 1) {
    // Tie-breaking: Random selection
    tieOccurred = true
    const randomIndex = Math.floor(Math.random() * playersWithMaxVotes.length)
    eliminatedPlayerId = playersWithMaxVotes[randomIndex]
    console.log(`Vote tie broken randomly: ${playersWithMaxVotes.length} players tied, selected ${eliminatedPlayerId}`)
  }

  return {
    eliminatedPlayerId,
    voteCount,
    tieOccurred
  }
}

/**
 * Validate room interaction permissions
 */
export function validateRoomInteraction(
  player: any,
  roomObject: any,
  action: string,
  itemName?: string
): void {
  if (!player.isAlive) {
    throw new Error('Dead players cannot interact with room objects')
  }

  if (roomObject.lastUpdatedBy === player.id && roomObject.state !== 'UNTOUCHED') {
    throw new Error('You have already interacted with this object this phase')
  }

  if (action === 'PLACE' && !itemName) {
    throw new Error('Item name is required for PLACE action')
  }

  const validActions = ['DESTROY', 'CLEAN', 'VISIT', 'PLACE']
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action: ${action}`)
  }
}

/**
 * Game state locking mechanism
 */
const gameStateLocks = new Map<string, boolean>()

export function acquireGameLock(gameId: string): void {
  if (gameStateLocks.get(gameId)) {
    throw new Error('Game state is currently being updated. Please try again.')
  }
  gameStateLocks.set(gameId, true)
}

export function releaseGameLock(gameId: string): void {
  gameStateLocks.delete(gameId)
}

export function withGameLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      acquireGameLock(gameId)
      const result = await operation()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      releaseGameLock(gameId)
    }
  })
}

/**
 * Validate authenticated game access
 */
export async function validateAuthenticatedGameAccess(
  request: NextRequest,
  gameId: string,
  playerId: string,
  options: {
    requireAlive?: boolean
    requireHost?: boolean
    allowedStatuses?: ('WAITING' | 'PLAYING' | 'ENDED')[]
  } = {}
): Promise<GameValidationResult> {
  // Check authentication
  const user = await getAuthUser(request)
  if (!user) {
    throw new Error('Authentication required')
  }

  // Validate game access
  const result = await validateGameAccess(gameId, playerId, options)

  // Verify the player belongs to the authenticated user
  if (result.player.userId !== user.id) {
    throw new Error('Unauthorized access to player data')
  }

  return result
}
