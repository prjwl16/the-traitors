'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../lib/useAuth'

interface PublicGame {
  id: string
  code: string
  gameName: string
  playerCount: number
  maxPlayers: number
  createdAt: string
  hostName: string
  canJoin: boolean
  isAlreadyPlayer: boolean
  hasPendingRequest: boolean
  isHost: boolean
  pendingRequestsCount: number
}

export default function PublicGamesPage() {
  const { user, loading: authLoading } = useAuth()
  const [games, setGames] = useState<PublicGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [showJoinModal, setShowJoinModal] = useState<string | null>(null)
  const router = useRouter()

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchPublicGames()
    }
  }, [user])

  const fetchPublicGames = async () => {
    try {
      const response = await fetch('/api/games/public')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch public games')
      }

      setGames(data.games)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch public games')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRequest = async (gameId: string) => {
    if (!playerName.trim()) {
      setError('Player name is required')
      return
    }

    setJoinLoading(gameId)
    setError('')

    try {
      const response = await fetch(`/api/games/${gameId}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send join request')
      }

      // Refresh the games list
      await fetchPublicGames()
      setShowJoinModal(null)
      setPlayerName('')
      
      // Show success message
      alert('Join request sent successfully! The host will review your request.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send join request')
    } finally {
      setJoinLoading(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading public games...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">🌍 Public Games</h1>
              <p className="text-slate-300 mt-2">Join open games from other players</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchPublicGames}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
              <Link
                href="/dashboard"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mb-8">
            {error}
          </div>
        )}

        {/* Games List */}
        <div className="space-y-4">
          {games.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <p className="text-slate-300 text-lg mb-4">No public games available</p>
              <p className="text-slate-400 text-sm">
                Create a public game from the dashboard to let others join!
              </p>
            </div>
          ) : (
            games.map((game) => (
              <div key={game.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{game.gameName}</h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400">
                        Code: {game.code}
                      </span>
                      {game.isHost && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-400/10 text-yellow-400">
                          YOUR GAME
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Host</p>
                        <p className="text-white">{game.hostName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Players</p>
                        <p className="text-white">{game.playerCount}/{game.maxPlayers}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Created</p>
                        <p className="text-white">{new Date(game.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Status</p>
                        <p className="text-white">Waiting for players</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {game.isAlreadyPlayer && (
                      <Link
                        href={`/game/${game.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Enter Game
                      </Link>
                    )}

                    {game.isHost && (
                      <>
                        <Link
                          href={`/games/${game.id}/details`}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                          View Details
                        </Link>
                        {game.pendingRequestsCount > 0 && (
                          <Link
                            href={`/game/${game.id}/admin`}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            {game.pendingRequestsCount} Pending Request{game.pendingRequestsCount !== 1 ? 's' : ''}
                          </Link>
                        )}
                      </>
                    )}

                    {game.hasPendingRequest && (
                      <span className="bg-yellow-600/20 text-yellow-400 px-4 py-2 rounded-lg font-medium">
                        Request Pending
                      </span>
                    )}

                    {game.canJoin && (
                      <button
                        onClick={() => setShowJoinModal(game.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Request to Join Game</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your Player Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleJoinRequest(showJoinModal)}
                    disabled={joinLoading === showJoinModal}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {joinLoading === showJoinModal ? 'Sending...' : 'Send Request'}
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinModal(null)
                      setPlayerName('')
                      setError('')
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
