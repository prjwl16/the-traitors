'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface StoryEvent {
  type: 'narration' | 'elimination' | 'phase_change' | 'chaos_event'
  phase: 'DAY' | 'NIGHT'
  day: number
  content: string
  timestamp: string
  playerName?: string
  playerRole?: string
  eliminationType?: 'banished' | 'killed'
  eventType?: string
}

interface GameData {
  id: string
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
}

export default function StoryPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [storyEvents, setStoryEvents] = useState<StoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStoryData = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/story`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch story data')
      }

      setGameData(data.game)
      setStoryEvents(data.events)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch story data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId) {
      fetchStoryData()
      // Poll for updates every 5 seconds if game is still playing
      const interval = setInterval(fetchStoryData, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading story...</div>
      </div>
    )
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Failed to load story'}</p>
          <Link 
            href={`/game/${gameId}`}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-block"
          >
            Back to Game
          </Link>
        </div>
      </div>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getEventIcon = (event: StoryEvent) => {
    switch (event.type) {
      case 'narration':
        return event.phase === 'DAY' ? '☀️' : '🌙'
      case 'elimination':
        return event.eliminationType === 'banished' ? '⚖️' : '💀'
      case 'phase_change':
        return '🔄'
      case 'chaos_event':
        return '🧨'
      default:
        return '📖'
    }
  }

  const getEventColor = (event: StoryEvent) => {
    switch (event.type) {
      case 'narration':
        return event.phase === 'DAY' ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-blue-500/40 bg-blue-500/10'
      case 'elimination':
        return 'border-red-500/40 bg-red-500/10'
      case 'phase_change':
        return 'border-purple-500/40 bg-purple-500/10'
      case 'chaos_event':
        return 'border-orange-500/40 bg-orange-500/10'
      default:
        return 'border-white/20 bg-white/5'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Game Story</h1>
              <p className="text-slate-300">
                {gameData.status === 'ENDED' ? 'Final Chronicle' : `Day ${gameData.currentDay} - ${gameData.currentPhase} Phase`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link 
                href={`/game/${gameId}`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Back to Game
              </Link>
              {gameData.status === 'ENDED' && (
                <Link 
                  href={`/game/${gameId}/reveal`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Full Reveal
                </Link>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Story Timeline */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Chronicle of Events</h2>
          
          {storyEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">The story has yet to unfold...</p>
              <p className="text-slate-500 text-sm">Events will appear here as the game progresses.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {storyEvents.map((event, index) => (
                <div
                  key={index}
                  className={`relative border rounded-lg p-6 ${getEventColor(event)}`}
                >
                  {/* Timeline connector */}
                  {index < storyEvents.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-6 bg-white/20"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{getEventIcon(event)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-white font-semibold">
                          Day {event.day} - {event.phase} Phase
                          {event.type === 'elimination' && event.playerName && (
                            <span className="ml-2 text-sm font-normal text-slate-300">
                              ({event.playerName} {event.eliminationType})
                            </span>
                          )}
                          {event.type === 'chaos_event' && event.eventType && (
                            <span className="ml-2 text-sm font-normal text-orange-300">
                              - {event.eventType}
                            </span>
                          )}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-slate-200 leading-relaxed">
                        {event.content}
                      </div>
                      
                      {event.type === 'elimination' && event.playerRole && (
                        <div className="mt-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            event.playerRole === 'TRAITOR' 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {event.playerName} was a {event.playerRole}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="text-center">
            {gameData.status === 'WAITING' && (
              <p className="text-slate-300">The game has not yet begun. The story will unfold once players start their deadly game of deception.</p>
            )}
            {gameData.status === 'PLAYING' && (
              <p className="text-slate-300">The story continues to unfold... Check back regularly for new developments.</p>
            )}
            {gameData.status === 'ENDED' && (
              <div>
                <p className="text-white text-lg font-semibold mb-2">The Final Chapter</p>
                <p className="text-slate-300">The game has concluded. All secrets have been revealed, and the truth has come to light.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
