'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../../lib/useAuth'

interface GameDetails {
  id: string
  code: string
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  createdAt: string
  updatedAt: string
  endedAt?: string
  winner?: string
  players: Array<{
    id: string
    name: string
    isHost: boolean
    isAlive: boolean
    role?: 'TRAITOR' | 'FAITHFUL'
    userId: string
  }>
  votes: Array<{
    id: string
    phase: 'DAY' | 'NIGHT'
    day: number
    voter: { name: string }
    target: { name: string }
    createdAt: string
  }>
  whispers: Array<{
    id: string
    phase: 'DAY' | 'NIGHT'
    day: number
    content: string
    fromPlayer: { name: string }
    toPlayer: { name: string }
    createdAt: string
  }>
  narrations: Array<{
    id: string
    phase: 'DAY' | 'NIGHT'
    day: number
    content: string
    createdAt: string
  }>
}

interface JoinRequest {
  id: string
  playerName: string
  userEmail: string
  createdAt: string
}

export default function GameDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const { user, loading: authLoading } = useAuth()
  
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'votes' | 'whispers' | 'requests'>('overview')
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (gameId && user) {
      fetchGameDetails()
    }
  }, [gameId, user])

  // Define currentUserPlayer here so it can be used in useEffect dependencies
  const currentUserPlayer = gameDetails?.players.find(p => p.userId === user?.id)

  useEffect(() => {
    if (gameDetails && currentUserPlayer?.isHost && gameDetails.status === 'WAITING') {
      fetchJoinRequests()
    }
  }, [gameDetails, currentUserPlayer])

  const fetchGameDetails = async () => {
    try {
      // For ended games, use reveal endpoint, otherwise use regular game endpoint
      const response = await fetch(`/api/games/${gameId}/reveal`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch game details')
      }

      setGameDetails({
        id: data.game.id,
        code: data.game.code || 'N/A',
        status: data.game.status,
        currentPhase: data.game.currentPhase || 'DAY',
        currentDay: data.game.currentDay || 1,
        createdAt: data.game.createdAt,
        updatedAt: data.game.updatedAt,
        endedAt: data.game.endedAt,
        winner: data.game.winner,
        players: data.players || [],
        votes: data.votes || [],
        whispers: data.whispers || [],
        narrations: data.narrations || []
      })
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game details')
    } finally {
      setLoading(false)
    }
  }

  const fetchJoinRequests = async () => {
    if (!gameDetails || !currentUserPlayer?.isHost || gameDetails.status !== 'WAITING') return

    setRequestsLoading(true)
    try {
      const response = await fetch(`/api/games/${gameId}/join-requests`)
      const data = await response.json()

      if (response.ok) {
        setJoinRequests(data.requests)
      }
    } catch (err) {
      console.error('Failed to fetch join requests:', err)
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleJoinRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/games/${gameId}/join-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} request`)
      }

      // Refresh both game data and join requests
      await Promise.all([fetchGameDetails(), fetchJoinRequests()])

      alert(`Join request ${action}ed successfully!`)
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} request`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'text-yellow-400 bg-yellow-400/10'
      case 'PLAYING': return 'text-green-400 bg-green-400/10'
      case 'ENDED': return 'text-gray-400 bg-gray-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'TRAITOR': return 'text-red-400'
      case 'FAITHFUL': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game details...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  if (error || !gameDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Game not found'}</p>
          <Link
            href="/games/history"
            className="mt-4 inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Back to History
          </Link>
        </div>
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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">🎭 Game {gameDetails.code}</h1>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(gameDetails.status)}`}>
                  {gameDetails.status}
                </span>
              </div>
              <p className="text-slate-300">
                {currentUserPlayer ? `Playing as ${currentUserPlayer.name}` : 'Game Details'}
                {currentUserPlayer?.role && (
                  <span className={`ml-2 font-medium ${getRoleColor(currentUserPlayer.role)}`}>
                    ({currentUserPlayer.role})
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              {gameDetails.status === 'PLAYING' && currentUserPlayer?.isAlive && (
                <Link
                  href={`/game/${gameDetails.id}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Rejoin Game
                </Link>
              )}
              <Link
                href="/games/history"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/20"
              >
                Back to History
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'timeline', label: 'Timeline' },
              { key: 'votes', label: 'Votes' },
              { key: 'whispers', label: 'Whispers' },
              ...(currentUserPlayer?.isHost && gameDetails?.status === 'WAITING' ? [
                { key: 'requests', label: `Join Requests (${joinRequests.length})` }
              ] : [])
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Game Information</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-400">Created</p>
                    <p className="text-white">{new Date(gameDetails.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Last Updated</p>
                    <p className="text-white">{new Date(gameDetails.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Progress</p>
                    <p className="text-white">
                      {gameDetails.status === 'PLAYING' ? `Day ${gameDetails.currentDay} ${gameDetails.currentPhase}` : 
                       gameDetails.status === 'ENDED' ? `Completed` : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Winner</p>
                    <p className="text-white">{gameDetails.winner || 'TBD'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Players ({gameDetails.players.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gameDetails.players.map((player) => (
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
                        {player.role && (
                          <span className={`text-xs font-medium ${getRoleColor(player.role)}`}>
                            {player.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Game Timeline</h3>
              <div className="space-y-4">
                {gameDetails.narrations.map((narration) => (
                  <div key={narration.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">
                        Day {narration.day} {narration.phase}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(narration.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white">{narration.content}</p>
                  </div>
                ))}
                {gameDetails.narrations.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No timeline events yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'votes' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Voting History</h3>
              <div className="space-y-4">
                {gameDetails.votes.map((vote) => (
                  <div key={vote.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white">
                        <strong>{vote.voter.name}</strong> voted for <strong>{vote.target.name}</strong>
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">
                          Day {vote.day} {vote.phase}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(vote.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {gameDetails.votes.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No votes cast yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'whispers' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Whisper History</h3>
              <div className="space-y-4">
                {gameDetails.whispers.map((whisper) => (
                  <div key={whisper.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">
                        <strong>{whisper.fromPlayer.name}</strong> → <strong>{whisper.toPlayer.name}</strong>
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">
                          Day {whisper.day} {whisper.phase}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(whisper.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-white">{whisper.content}</p>
                  </div>
                ))}
                {gameDetails.whispers.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No whispers sent yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && currentUserPlayer?.isHost && gameDetails?.status === 'WAITING' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Join Requests ({joinRequests.length})</h3>
                <button
                  onClick={fetchJoinRequests}
                  disabled={requestsLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                >
                  {requestsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {joinRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-lg">No pending join requests</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Players can request to join your public game from the public games page
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium text-lg">{request.playerName}</p>
                          <p className="text-slate-400 text-sm">{request.userEmail}</p>
                          <p className="text-slate-500 text-xs">
                            Requested {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleJoinRequest(request.id, 'accept')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() => handleJoinRequest(request.id, 'reject')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
