'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [hostName, setHostName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const createGame = async () => {
    if (!hostName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: hostName.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game')
      }

      // Store player info in localStorage
      localStorage.setItem('playerId', data.hostId)
      localStorage.setItem('playerName', hostName.trim())

      router.push(`/game/${data.gameId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!gameCode.trim()) {
      setError('Please enter a game code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          gameCode: gameCode.toUpperCase()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join game')
      }

      // Store player info in localStorage
      localStorage.setItem('playerId', data.playerId)
      localStorage.setItem('playerName', data.playerName)

      router.push(`/game/${data.gameId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">The Traitors</h1>
          <p className="text-slate-300">A game of deception and deduction</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Create New Game</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <button
                onClick={createGame}
                disabled={loading || !hostName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Join Existing Game</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Enter game code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <button
                onClick={joinGame}
                disabled={loading || !playerName.trim() || !gameCode.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-slate-400 text-sm">
          <p>4-12 players • Social deduction game</p>
        </div>
      </div>
    </div>
  )
}
