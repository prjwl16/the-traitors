'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTarget, setSelectedTarget] = useState('')

  useEffect(() => {
    // Get player info from localStorage
    const storedPlayerId = localStorage.getItem('playerId')
    const storedPlayerName = localStorage.getItem('playerName')
    
    if (!storedPlayerId || !storedPlayerName) {
      router.push('/')
      return
    }
    
    setPlayerId(storedPlayerId)
    setPlayerName(storedPlayerName)
  }, [router])

  const fetchGameData = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch game data')
      }

      setGameData(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId && playerId) {
      fetchGameData()
      // Poll for updates every 3 seconds
      const interval = setInterval(fetchGameData, 3000)
      return () => clearInterval(interval)
    }
  }, [gameId, playerId])

  const startGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: playerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game')
      }

      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    }
  }

  const submitVote = async () => {
    if (!selectedTarget) return

    try {
      const response = await fetch(`/api/games/${gameId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          voterId: playerId, 
          targetId: selectedTarget 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote')
      }

      setSelectedTarget('')
      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote')
    }
  }

  const nextPhase = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/next-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: playerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to advance phase')
      }

      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance phase')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Game not found'}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const currentPlayer = gameData.players.find(p => p.id === playerId)
  const isHost = currentPlayer?.isHost || false
  const hasVoted = gameData.hasVoted.includes(playerId || '')
  const alivePlayers = gameData.players.filter(p => p.isAlive)
  const canVote = gameData.status === 'PLAYING' && currentPlayer?.isAlive && 
    (gameData.currentPhase === 'DAY' || 
     (gameData.currentPhase === 'NIGHT' && currentPlayer?.role === 'TRAITOR'))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">The Traitors</h1>
              <p className="text-slate-300">Game Code: <span className="font-mono text-lg">{gameData.code}</span></p>
            </div>
            <div className="text-right">
              <p className="text-white">Welcome, {playerName}</p>
              {currentPlayer?.role && (
                <p className={`font-bold ${currentPlayer.role === 'TRAITOR' ? 'text-red-400' : 'text-blue-400'}`}>
                  You are a {currentPlayer.role}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        {gameData.status === 'PLAYING' && (
          <div className="hidden md:block bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href={`/game/${gameId}/mission`}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                📋 Your Mission
              </Link>
              <Link
                href={`/game/${gameId}/whispers`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                💬 Whispers
              </Link>
              <Link
                href={`/game/${gameId}/room`}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🏛️ Room of Secrets
              </Link>
              <Link
                href={`/game/${gameId}/story`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                📖 Game Story
              </Link>
              {isHost && (
                <Link
                  href={`/game/${gameId}/admin`}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  👑 Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Game Status */}
        {gameData.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Waiting for Players</h2>
            <p className="text-slate-300 mb-4">
              {gameData.players.length} players joined (minimum 4 required)
            </p>
            {isHost && gameData.players.length >= 4 && (
              <button
                onClick={startGame}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Start Game
              </button>
            )}
          </div>
        )}

        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                Day {gameData.currentDay} - {gameData.currentPhase} Phase
              </h2>
              {isHost && (
                <button
                  onClick={nextPhase}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Next Phase
                </button>
              )}
            </div>
            
            {gameData.currentPhase === 'DAY' && (
              <p className="text-slate-300 mb-4">
                All players vote to banish someone they suspect is a traitor.
              </p>
            )}
            
            {gameData.currentPhase === 'NIGHT' && (
              <p className="text-slate-300 mb-4">
                {currentPlayer?.role === 'TRAITOR' 
                  ? 'Traitors vote to eliminate a faithful player.'
                  : 'The traitors are deciding who to eliminate...'}
              </p>
            )}
          </div>
        )}

        {/* Players List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Players ({alivePlayers.length} alive)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gameData.players.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border ${
                  player.isAlive 
                    ? 'bg-white/5 border-white/20' 
                    : 'bg-red-500/10 border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${player.isAlive ? 'text-white' : 'text-red-400'}`}>
                    {player.name}
                    {player.isHost && ' 👑'}
                    {!player.isAlive && ' 💀'}
                  </span>
                  {gameData.currentVotes[player.id] && (
                    <span className="text-sm text-slate-400">
                      {gameData.currentVotes[player.id]} votes
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voting */}
        {canVote && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cast Your Vote</h3>
            {hasVoted ? (
              <p className="text-green-400">You have already voted this phase.</p>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Select a player to vote for...</option>
                  {alivePlayers
                    .filter(p => p.id !== playerId)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={submitVote}
                  disabled={!selectedTarget}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium"
                >
                  Submit Vote
                </button>
              </div>
            )}
          </div>
        )}

        {gameData.status === 'ENDED' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">🎭 Game Over!</h2>
            <p className="text-slate-300 mb-6">The game has concluded. All secrets will now be revealed!</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href={`/game/${gameId}/reveal`}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                🏆 View Final Reveal
              </Link>
              <Link
                href={`/game/${gameId}/story`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                📖 Read Full Story
              </Link>
              <Link
                href="/"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                🎮 Start New Game
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        {gameData.status === 'PLAYING' && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/20 p-4">
            <div className="flex justify-around max-w-lg mx-auto">
              <Link
                href={`/game/${gameId}/mission`}
                className="flex flex-col items-center text-white hover:text-green-400 transition-colors"
              >
                <span className="text-xl mb-1">📋</span>
                <span className="text-xs">Mission</span>
              </Link>
              <Link
                href={`/game/${gameId}/whispers`}
                className="flex flex-col items-center text-white hover:text-indigo-400 transition-colors"
              >
                <span className="text-xl mb-1">💬</span>
                <span className="text-xs">Whispers</span>
              </Link>
              <Link
                href={`/game/${gameId}/room`}
                className="flex flex-col items-center text-white hover:text-amber-400 transition-colors"
              >
                <span className="text-xl mb-1">🏛️</span>
                <span className="text-xs">Room</span>
              </Link>
              <Link
                href={`/game/${gameId}/story`}
                className="flex flex-col items-center text-white hover:text-blue-400 transition-colors"
              >
                <span className="text-xl mb-1">📖</span>
                <span className="text-xs">Story</span>
              </Link>
              {isHost && (
                <Link
                  href={`/game/${gameId}/admin`}
                  className="flex flex-col items-center text-white hover:text-purple-400 transition-colors"
                >
                  <span className="text-xl mb-1">👑</span>
                  <span className="text-xs">Admin</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add bottom padding for mobile nav */}
      {gameData?.status === 'PLAYING' && <div className="md:hidden h-20"></div>}
    </div>
  )
}
