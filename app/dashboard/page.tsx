'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/useAuth'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const [hostName, setHostName] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [gameName, setGameName] = useState('')
  const router = useRouter()

  // Redirect to auth if not authenticated
  if (!loading && !user) {
    router.push('/auth')
    return null
  }

  // Fetch recent games for quick stats
  useEffect(() => {
    if (user) {
      fetchRecentGames()
    }
  }, [user])

  const fetchRecentGames = async () => {
    try {
      const response = await fetch('/api/games/history')
      const data = await response.json()
      if (response.ok) {
        setRecentGames(data.games.slice(0, 3)) // Show last 3 games
      }
    } catch (err) {
      console.error('Failed to fetch recent games:', err)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hostName.trim()) {
      setError('Host name is required')
      return
    }

    if (isPublic && !gameName.trim()) {
      setError('Game name is required for public games')
      return
    }

    setCreateLoading(true)
    setError('')

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: hostName.trim(),
          isPublic,
          gameName: isPublic ? gameName.trim() : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game')
      }

      router.push(`/game/${data.gameId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!playerName.trim() || !gameCode.trim()) {
      setError('Player name and game code are required')
      return
    }

    setJoinLoading(true)
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

      router.push(`/game/${data.gameId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">🎭 The Traitors</h1>
              <p className="text-slate-300 mt-2">Welcome, {user?.email}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/games/public"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🌍 Public Games
              </Link>
              <Link
                href="/games/history"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
              >
                📚 Game History
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Create Game */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Name (as Host)
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-slate-300">
                  Make this a public game (others can request to join)
                </label>
              </div>

              {isPublic && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Name (for public listing)
                  </label>
                  <input
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Friday Night Traitors"
                    required={isPublic}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {createLoading ? 'Creating...' : `Create ${isPublic ? 'Public' : 'Private'} Game`}
              </button>
            </form>
          </div>

          {/* Join Game */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Join Existing Game</h2>
            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Code
                </label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={joinLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {joinLoading ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mt-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Recent Games</h2>
                <Link
                  href="/games/history"
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  View All →
                </Link>
              </div>
              <div className="space-y-3">
                {recentGames.map((game) => (
                  <div key={game.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Game {game.code}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            game.status === 'WAITING' ? 'bg-yellow-400/10 text-yellow-400' :
                            game.status === 'PLAYING' ? 'bg-green-400/10 text-green-400' :
                            'bg-gray-400/10 text-gray-400'
                          }`}>
                            {game.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">
                          {game.playerCount} players • {new Date(game.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {game.canRejoin && (
                          <Link
                            href={`/game/${game.id}`}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Rejoin
                          </Link>
                        )}
                        <Link
                          href={`/games/${game.id}/details`}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
