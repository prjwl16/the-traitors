'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../lib/useAuth'

interface GameHistoryItem {
  id: string
  code: string
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  createdAt: string
  updatedAt: string
  endedAt?: string
  winner?: string
  playerCount: number
  aliveCount: number
  isHost: boolean
  playerName: string
  playerRole?: 'TRAITOR' | 'FAITHFUL'
  isPlayerAlive: boolean
  canRejoin: boolean
  activityCount: {
    votes: number
    whispers: number
    narrations: number
  }
}

export default function GameHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [games, setGames] = useState<GameHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing' | 'ended'>('all')
  const router = useRouter()

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchGameHistory()
    }
  }, [user])

  const fetchGameHistory = async () => {
    try {
      const response = await fetch('/api/games/history')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch game history')
      }

      setGames(data.games)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game history')
    } finally {
      setLoading(false)
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

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true
    return game.status.toLowerCase() === filter
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game history...</div>
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
              <h1 className="text-4xl font-bold">🎭 Game History</h1>
              <p className="text-slate-300 mt-2">Your past and ongoing games</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'all', label: 'All Games' },
              { key: 'waiting', label: 'Waiting' },
              { key: 'playing', label: 'Playing' },
              { key: 'ended', label: 'Ended' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mb-8">
            {error}
          </div>
        )}

        {/* Games List */}
        <div className="space-y-4">
          {filteredGames.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <p className="text-slate-300 text-lg">
                {filter === 'all' ? 'No games found' : `No ${filter} games found`}
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Create Your First Game
              </Link>
            </div>
          ) : (
            filteredGames.map((game) => (
              <div key={game.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">Game {game.code}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(game.status)}`}>
                        {game.status}
                      </span>
                      {game.isHost && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-400/10 text-yellow-400">
                          HOST
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Your Role</p>
                        <p className={`font-medium ${getRoleColor(game.playerRole)}`}>
                          {game.playerRole || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Players</p>
                        <p className="text-white">{game.playerCount} total</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Progress</p>
                        <p className="text-white">
                          {game.status === 'PLAYING' ? `Day ${game.currentDay} ${game.currentPhase}` : 
                           game.status === 'ENDED' ? `Winner: ${game.winner}` : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Last Updated</p>
                        <p className="text-white">{new Date(game.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {game.canRejoin && (
                      <Link
                        href={`/game/${game.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Rejoin Game
                      </Link>
                    )}
                    
                    {game.status === 'ENDED' && (
                      <Link
                        href={`/game/${game.id}/reveal`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        View Results
                      </Link>
                    )}
                    
                    <Link
                      href={`/games/${game.id}/details`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
