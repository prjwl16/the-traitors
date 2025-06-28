'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Player {
  id: string
  name: string
  isAlive: boolean
  isHost: boolean
  role?: 'TRAITOR' | 'FAITHFUL'
}

interface GameData {
  id: string
  code: string
  hostId: string
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  players: Player[]
  currentVotes: Record<string, number>
  hasVoted: string[]
}

interface UseGameStateOptions {
  gameId: string
  playerId: string | null
  pollInterval?: number
  onError?: (error: Error) => void
}

interface UseGameStateResult {
  gameData: GameData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isConnected: boolean
}

export function useGameState({
  gameId,
  playerId,
  pollInterval = 3000,
  onError
}: UseGameStateOptions): UseGameStateResult {
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  const fetchGameData = useCallback(async () => {
    if (!gameId) return

    try {
      const response = await fetch(`/api/games/${gameId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to fetch game data`)
      }

      setGameData(data)
      setError(null)
      setIsConnected(true)
      retryCountRef.current = 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game data'
      console.error('Error fetching game data:', err)
      
      retryCountRef.current += 1
      
      if (retryCountRef.current >= maxRetries) {
        setError(errorMessage)
        setIsConnected(false)
        onError?.(err instanceof Error ? err : new Error(errorMessage))
      } else {
        // Don't show error immediately, just mark as disconnected
        setIsConnected(false)
        console.log(`Retry ${retryCountRef.current}/${maxRetries} for game data fetch`)
      }
    } finally {
      setLoading(false)
    }
  }, [gameId, onError])

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    retryCountRef.current = 0
    await fetchGameData()
  }, [fetchGameData])

  // Initial fetch
  useEffect(() => {
    if (gameId && playerId) {
      fetchGameData()
    }
  }, [gameId, playerId, fetchGameData])

  // Polling
  useEffect(() => {
    if (!gameId || !playerId || error) return

    intervalRef.current = setInterval(fetchGameData, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [gameId, playerId, pollInterval, fetchGameData, error])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    gameData,
    loading,
    error,
    refetch,
    isConnected
  }
}

// Hook for game actions with error handling
export function useGameActions(gameId: string, playerId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeAction = useCallback(async (
    action: () => Promise<Response>,
    successMessage?: string
  ) => {
    if (!playerId) {
      throw new Error('Player ID is required')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await action()
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Action failed`)
      }

      if (successMessage) {
        console.log(successMessage)
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [playerId])

  const submitVote = useCallback(async (targetId: string) => {
    return executeAction(
      () => fetch(`/api/games/${gameId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: playerId, targetId })
      }),
      'Vote submitted successfully'
    )
  }, [gameId, playerId, executeAction])

  const startGame = useCallback(async () => {
    return executeAction(
      () => fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: playerId })
      }),
      'Game started successfully'
    )
  }, [gameId, playerId, executeAction])

  const nextPhase = useCallback(async () => {
    return executeAction(
      () => fetch(`/api/games/${gameId}/next-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: playerId })
      }),
      'Phase advanced successfully'
    )
  }, [gameId, playerId, executeAction])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    submitVote,
    startGame,
    nextPhase,
    clearError
  }
}

// Validation helpers
export function validateGameData(gameData: GameData | null): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!gameData) {
    errors.push('Game data is missing')
    return { isValid: false, errors }
  }

  if (!gameData.players || gameData.players.length === 0) {
    errors.push('No players found in game')
  }

  if (gameData.status === 'PLAYING') {
    const alivePlayers = gameData.players.filter(p => p.isAlive)
    if (alivePlayers.length < 2) {
      errors.push('Not enough alive players to continue game')
    }

    const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR').length
    const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL').length

    if (aliveTraitors === 0 && gameData.status === 'PLAYING') {
      errors.push('Game should have ended - no traitors remaining')
    }

    if (aliveTraitors >= aliveFaithfuls && gameData.status === 'PLAYING') {
      errors.push('Game should have ended - traitors equal or outnumber faithfuls')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
