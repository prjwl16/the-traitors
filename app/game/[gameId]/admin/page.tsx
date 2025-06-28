'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../../lib/useAuth'

interface Player {
  id: string
  name: string
  isAlive: boolean
  isHost: boolean
  role?: 'TRAITOR' | 'FAITHFUL'
  userId: string
}

interface GameData {
  id: string
  code: string
  hostId: string
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  currentPlayerId?: string
  players: Player[]
  currentVotes: Record<string, number>
  hasVoted: string[]
}

interface JoinRequest {
  id: string
  playerName: string
  userEmail: string
  createdAt: string
}

export default function AdminPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const { user, loading: authLoading } = useAuth()

  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoPhaseEnabled, setAutoPhaseEnabled] = useState(false)
  const [phaseDuration, setPhaseDuration] = useState(12)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  const fetchGameData = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/games/${gameId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch game data')
      }

      setGameData(data)

      // Fetch auto-phase status
      const autoPhaseResponse = await fetch(`/api/games/${gameId}/auto-phase`)
      const autoPhaseData = await autoPhaseResponse.json()

      if (autoPhaseResponse.ok) {
        setAutoPhaseEnabled(autoPhaseData.autoPhaseEnabled)
        setPhaseDuration(autoPhaseData.phaseDurationHours)
        setTimeRemaining(autoPhaseData.timeRemaining)
      }

      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game data')
    } finally {
      setLoading(false)
    }
  }

  const fetchJoinRequests = async () => {
    if (!user || !gameData) return

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
      await Promise.all([fetchGameData(), fetchJoinRequests()])

      alert(`Join request ${action}ed successfully!`)
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} request`)
    }
  }

  useEffect(() => {
    if (gameId && user && !authLoading) {
      fetchGameData()
      // Poll for updates every 2 seconds
      const interval = setInterval(fetchGameData, 2000)
      return () => clearInterval(interval)
    }
  }, [gameId, user, authLoading])

  useEffect(() => {
    if (gameData && gameData.status === 'WAITING') {
      fetchJoinRequests()
      // Poll for join requests every 10 seconds
      const interval = setInterval(fetchJoinRequests, 10000)
      return () => clearInterval(interval)
    }
  }, [gameData])

  const nextPhase = async () => {
    if (!gameData?.currentPlayerId) return

    try {
      const response = await fetch(`/api/games/${gameId}/next-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: gameData.currentPlayerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to advance phase')
      }

      if (data.eliminatedPlayerId) {
        const eliminatedPlayer = gameData?.players.find(p => p.id === data.eliminatedPlayerId)
        alert(`${eliminatedPlayer?.name} has been eliminated!`)
      }

      if (data.gameEnded) {
        alert(`Game Over! ${data.winner} win!`)
      }

      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance phase')
    }
  }

  const generateNarration = async () => {
    try {
      const response = await fetch('/api/narration/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, hostId: gameData?.currentPlayerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate narration')
      }

      alert('Narration generated successfully!')
      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate narration')
    }
  }

  const generateMissions = async () => {
    try {
      const response = await fetch('/api/missions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, hostId: gameData?.currentPlayerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate missions')
      }

      alert(`Generated ${data.missionsGenerated} missions successfully!`)
      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate missions')
    }
  }

  const generateChaosEvent = async () => {
    try {
      const response = await fetch('/api/events/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, hostId: gameData?.currentPlayerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate chaos event')
      }

      alert('Chaos event generated successfully!')
      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chaos event')
    }
  }

  const toggleAutoPhase = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/auto-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: gameData?.currentPlayerId,
          enabled: !autoPhaseEnabled,
          durationHours: phaseDuration
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle auto-phase')
      }

      setAutoPhaseEnabled(data.autoPhaseEnabled)
      alert(data.message)
      fetchGameData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle auto-phase')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin panel...</div>
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

  const currentPlayer = gameData.players.find(p => p.userId === user?.id)
  const isHost = currentPlayer?.isHost || false

  if (!isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="mb-4">Only the game host can access the admin panel.</p>
          <Link 
            href={`/game/${gameId}`}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-block"
          >
            Back to Game
          </Link>
        </div>
      </div>
    )
  }

  const alivePlayers = gameData.players.filter(p => p.isAlive)
  const deadPlayers = gameData.players.filter(p => !p.isAlive)
  const aliveTraitors = alivePlayers.filter(p => p.role === 'TRAITOR')
  const aliveFaithfuls = alivePlayers.filter(p => p.role === 'FAITHFUL')

  // Get vote summary
  const voteEntries = Object.entries(gameData.currentVotes)
  const totalVotes = Object.values(gameData.currentVotes).reduce((sum, count) => sum + count, 0)
  const votedPlayers = gameData.hasVoted.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-300">Game Code: <span className="font-mono text-lg">{gameData.code}</span></p>
            </div>
            <Link 
              href={`/game/${gameId}`}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Game
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Join Requests (only show if game is waiting) */}
        {gameData.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Join Requests ({joinRequests.length})
              </h3>
              <button
                onClick={fetchJoinRequests}
                disabled={requestsLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
              >
                {requestsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {joinRequests.length === 0 ? (
              <p className="text-slate-400">No pending join requests</p>
            ) : (
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div key={request.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">{request.playerName}</p>
                        <p className="text-slate-400 text-sm">{request.userEmail}</p>
                        <p className="text-slate-500 text-xs">
                          Requested {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleJoinRequest(request.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          ✅ Accept
                        </button>
                        <button
                          onClick={() => handleJoinRequest(request.id, 'reject')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
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

        {/* Game Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Game Status</h3>
            <p className="text-slate-300">Status: <span className="text-white">{gameData.status}</span></p>
            {gameData.status === 'PLAYING' && (
              <>
                <p className="text-slate-300">Phase: <span className="text-white">{gameData.currentPhase}</span></p>
                <p className="text-slate-300">Day: <span className="text-white">{gameData.currentDay}</span></p>
              </>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Player Count</h3>
            <p className="text-slate-300">Alive: <span className="text-green-400">{alivePlayers.length}</span></p>
            <p className="text-slate-300">Dead: <span className="text-red-400">{deadPlayers.length}</span></p>
            <p className="text-slate-300">Total: <span className="text-white">{gameData.players.length}</span></p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Role Distribution</h3>
            <p className="text-slate-300">Traitors: <span className="text-red-400">{aliveTraitors.length}</span></p>
            <p className="text-slate-300">Faithfuls: <span className="text-blue-400">{aliveFaithfuls.length}</span></p>
          </div>
        </div>

        {/* Auto-Phase Control */}
        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">⏱️ Auto-Phase Progression</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-3 h-3 rounded-full ${autoPhaseEnabled ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-white font-medium">
                    {autoPhaseEnabled ? 'Auto-Phase Enabled' : 'Manual Phase Control'}
                  </span>
                </div>

                {autoPhaseEnabled && timeRemaining !== null && (
                  <div className="mb-3">
                    <span className="text-slate-300 text-sm">
                      Next phase in: {Math.floor(timeRemaining / (1000 * 60 * 60))}h {Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))}m
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <label className="text-slate-300 text-sm">Duration (hours):</label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={phaseDuration}
                    onChange={(e) => setPhaseDuration(parseInt(e.target.value) || 12)}
                    className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                    disabled={autoPhaseEnabled}
                  />
                </div>

                <button
                  onClick={toggleAutoPhase}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    autoPhaseEnabled
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {autoPhaseEnabled ? 'Disable Auto-Phase' : 'Enable Auto-Phase'}
                </button>
              </div>

              <div className="text-slate-300 text-sm">
                <p className="mb-2">Auto-phase will:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Automatically advance phases after set duration</li>
                  <li>Process votes and eliminate players</li>
                  <li>Generate narrations and missions</li>
                  <li>Check win conditions</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AI Game Master Controls */}
        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Game Master</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={generateNarration}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Generate Narration
              </button>
              <button
                onClick={generateMissions}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Generate Missions
              </button>
              <button
                onClick={generateChaosEvent}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🧨 Chaos Event
              </button>
              <Link
                href={`/game/${gameId}/story`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-center"
              >
                📖 View Story
              </Link>
            </div>
            <p className="text-slate-300 text-sm mt-3">
              Generate AI content and trigger dramatic events to enhance the game experience.
            </p>
          </div>
        )}

        {/* Phase Control */}
        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Phase Control</h3>
              <button
                onClick={nextPhase}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Advance to Next Phase
              </button>
            </div>
            <p className="text-slate-300 text-sm">
              Current: Day {gameData.currentDay} - {gameData.currentPhase} Phase
            </p>
          </div>
        )}

        {/* Voting Status */}
        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Voting Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-2">Vote Summary</h4>
                <p className="text-slate-300 text-sm mb-2">
                  {votedPlayers} of {alivePlayers.length} players have voted
                </p>
                {voteEntries.length > 0 ? (
                  <div className="space-y-1">
                    {voteEntries
                      .sort(([,a], [,b]) => b - a)
                      .map(([playerId, votes]) => {
                        const player = gameData.players.find(p => p.id === playerId)
                        return (
                          <div key={playerId} className="flex justify-between text-sm">
                            <span className="text-white">{player?.name}</span>
                            <span className="text-slate-300">{votes} votes</span>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No votes cast yet</p>
                )}
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-2">Who Has Voted</h4>
                <div className="space-y-1">
                  {alivePlayers.map(player => (
                    <div key={player.id} className="flex justify-between text-sm">
                      <span className="text-white">{player.name}</span>
                      <span className={gameData.hasVoted.includes(player.id) ? 'text-green-400' : 'text-red-400'}>
                        {gameData.hasVoted.includes(player.id) ? '✓ Voted' : '✗ Not voted'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Players with Roles */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">All Players (Admin View)</h3>
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
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${player.isAlive ? 'text-white' : 'text-red-400'}`}>
                      {player.name}
                      {player.isHost && ' 👑'}
                      {!player.isAlive && ' 💀'}
                    </span>
                  </div>
                  {player.role && (
                    <div className={`text-sm font-medium ${
                      player.role === 'TRAITOR' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {player.role}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    Status: {player.isAlive ? 'Alive' : 'Dead'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
