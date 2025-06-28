'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  role: 'TRAITOR' | 'FAITHFUL'
  isAlive: boolean
  isHost: boolean
}

interface Vote {
  id: string
  phase: 'DAY' | 'NIGHT'
  day: number
  voter: { name: string }
  target: { name: string }
}

interface Mission {
  id: string
  playerId: string
  playerName: string
  phase: 'DAY' | 'NIGHT'
  day: number
  content: string
  completed: boolean
}

interface RevealData {
  game: {
    id: string
    status: string
    winner?: string
  }
  players: Player[]
  votes: Vote[]
  missions: Mission[]
  narrations: Array<{
    phase: 'DAY' | 'NIGHT'
    day: number
    content: string
  }>
  whispers: Array<{
    id: string
    fromPlayer: { name: string }
    toPlayer: { name: string }
    content: string
    phase: 'DAY' | 'NIGHT'
    day: number
    isLeaked: boolean
  }>
  chaosEvents: Array<{
    id: string
    type: string
    content: string
    phase: 'DAY' | 'NIGHT'
    day: number
  }>
}

export default function RevealPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [revealData, setRevealData] = useState<RevealData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'roles' | 'votes' | 'missions' | 'whispers' | 'chaos' | 'story'>('roles')

  useEffect(() => {
    const fetchRevealData = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/reveal`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch reveal data')
        }

        setRevealData(data)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reveal data')
      } finally {
        setLoading(false)
      }
    }

    if (gameId) {
      fetchRevealData()
    }
  }, [gameId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading final reveal...</div>
      </div>
    )
  }

  if (error || !revealData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Failed to load reveal data'}</p>
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

  const traitors = revealData.players.filter(p => p.role === 'TRAITOR')
  const faithfuls = revealData.players.filter(p => p.role === 'FAITHFUL')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">🎭 The Final Reveal</h1>
              <p className="text-slate-300">All secrets exposed</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href={`/game/${gameId}/story`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Game Story
              </Link>
              <Link 
                href={`/game/${gameId}`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Back to Game
              </Link>
            </div>
          </div>
        </div>

        {/* Winner Announcement */}
        {revealData.game.winner && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">🏆 Victory!</h2>
            <p className="text-white text-lg">
              The {revealData.game.winner.toLowerCase()} have won the game!
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'roles', label: '👥 All Roles', icon: '👥' },
              { key: 'votes', label: '🗳️ Voting History', icon: '🗳️' },
              { key: 'missions', label: '📋 All Missions', icon: '📋' },
              { key: 'whispers', label: '💬 All Whispers', icon: '💬' },
              { key: 'chaos', label: '🧨 Chaos Events', icon: '🧨' },
              { key: 'story', label: '📖 Full Story', icon: '📖' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traitors */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-red-400 mb-4">🔥 The Traitors</h3>
                  <div className="space-y-3">
                    {traitors.map((player) => (
                      <div key={player.id} className="flex justify-between items-center">
                        <span className="text-white font-medium">
                          {player.name} {player.isHost && '👑'}
                        </span>
                        <span className={`text-sm ${player.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                          {player.isAlive ? 'Survived' : 'Eliminated'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Faithfuls */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">⭐ The Faithfuls</h3>
                  <div className="space-y-3">
                    {faithfuls.map((player) => (
                      <div key={player.id} className="flex justify-between items-center">
                        <span className="text-white font-medium">
                          {player.name} {player.isHost && '👑'}
                        </span>
                        <span className={`text-sm ${player.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                          {player.isAlive ? 'Survived' : 'Eliminated'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'votes' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Complete Voting History</h3>
              {revealData.votes.length === 0 ? (
                <p className="text-slate-400">No votes were cast during this game.</p>
              ) : (
                <div className="space-y-3">
                  {revealData.votes.map((vote) => (
                    <div key={vote.id} className="bg-white/5 rounded-lg p-4 border border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="text-white">
                          <strong>{vote.voter.name}</strong> voted for <strong>{vote.target.name}</strong>
                        </span>
                        <span className="text-slate-400 text-sm">
                          Day {vote.day} - {vote.phase}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'missions' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">All Player Missions</h3>
              {revealData.missions.length === 0 ? (
                <p className="text-slate-400">No missions were assigned during this game.</p>
              ) : (
                <div className="space-y-4">
                  {revealData.players.map((player) => {
                    const playerMissions = revealData.missions.filter(m => m.playerId === player.id)
                    if (playerMissions.length === 0) return null
                    
                    return (
                      <div key={player.id} className="bg-white/5 rounded-lg p-4 border border-white/20">
                        <h4 className={`font-bold mb-3 ${
                          player.role === 'TRAITOR' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {player.name} ({player.role})
                        </h4>
                        <div className="space-y-2">
                          {playerMissions.map((mission) => (
                            <div key={mission.id} className="text-sm">
                              <div className="flex justify-between items-start">
                                <span className="text-white">{mission.content}</span>
                                <div className="text-right ml-4">
                                  <div className="text-slate-400">Day {mission.day} - {mission.phase}</div>
                                  <div className={`text-xs ${
                                    mission.completed ? 'text-green-400' : 'text-yellow-400'
                                  }`}>
                                    {mission.completed ? 'Completed' : 'Incomplete'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'whispers' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">All Secret Whispers</h3>
              {revealData.whispers.length === 0 ? (
                <p className="text-slate-400">No whispers were sent during this game.</p>
              ) : (
                <div className="space-y-3">
                  {revealData.whispers.map((whisper) => (
                    <div key={whisper.id} className="bg-white/5 rounded-lg p-4 border border-white/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white">
                          <strong>{whisper.fromPlayer.name}</strong> → <strong>{whisper.toPlayer.name}</strong>
                          {whisper.isLeaked && <span className="text-red-400 ml-2">📢 LEAKED</span>}
                        </span>
                        <span className="text-slate-400 text-sm">
                          Day {whisper.day} - {whisper.phase}
                        </span>
                      </div>
                      <p className="text-slate-200 italic">"{whisper.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chaos' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Chaos Events</h3>
              {revealData.chaosEvents.length === 0 ? (
                <p className="text-slate-400">No chaos events occurred during this game.</p>
              ) : (
                <div className="space-y-4">
                  {revealData.chaosEvents.map((event) => (
                    <div key={event.id} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-orange-400 font-medium">
                          🧨 {event.type}
                        </h4>
                        <span className="text-slate-400 text-sm">
                          Day {event.day} - {event.phase}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{event.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'story' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Complete Narration Timeline</h3>
              {revealData.narrations.length === 0 ? (
                <p className="text-slate-400">No narrations were generated during this game.</p>
              ) : (
                <div className="space-y-4">
                  {revealData.narrations.map((narration, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/20">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-white font-medium">
                          Day {narration.day} - {narration.phase} Phase
                        </h4>
                        <span className="text-2xl">
                          {narration.phase === 'DAY' ? '☀️' : '🌙'}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{narration.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
          <p className="text-slate-300 mb-4">
            Thank you for playing The Traitors! The game of deception and deduction has concluded.
          </p>
          <Link 
            href="/"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Start New Game
          </Link>
        </div>
      </div>
    </div>
  )
}
