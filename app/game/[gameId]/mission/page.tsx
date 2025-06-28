'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Mission {
  id: string
  phase: 'DAY' | 'NIGHT'
  day: number
  content: string
  completed: boolean
}

interface GameData {
  id: string
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  status: 'WAITING' | 'PLAYING' | 'ENDED'
}

export default function MissionPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [currentMission, setCurrentMission] = useState<Mission | null>(null)
  const [allMissions, setAllMissions] = useState<Mission[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const fetchMissions = async () => {
    if (!playerId) return

    try {
      // Fetch game data
      const gameResponse = await fetch(`/api/games/${gameId}`)
      const gameData = await gameResponse.json()

      if (!gameResponse.ok) {
        throw new Error(gameData.error || 'Failed to fetch game data')
      }

      setGameData(gameData)

      // Fetch player missions
      const missionsResponse = await fetch(`/api/games/${gameId}/missions?playerId=${playerId}`)
      const missionsData = await missionsResponse.json()

      if (!missionsResponse.ok) {
        throw new Error(missionsData.error || 'Failed to fetch missions')
      }

      setAllMissions(missionsData.missions || [])
      
      // Find current mission
      const current = missionsData.missions?.find(
        (m: Mission) => m.phase === gameData.currentPhase && m.day === gameData.currentDay
      )
      setCurrentMission(current || null)
      
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId && playerId) {
      fetchMissions()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchMissions, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId, playerId])

  const toggleMissionComplete = async () => {
    if (!currentMission) return

    try {
      const response = await fetch(`/api/games/${gameId}/missions/${currentMission.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update mission')
      }

      fetchMissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mission')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading missions...</div>
      </div>
    )
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Failed to load missions'}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Mission</h1>
              <p className="text-slate-300">Day {gameData.currentDay} - {gameData.currentPhase} Phase</p>
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

        {/* Current Mission */}
        {gameData.status === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Current Mission</h2>
            {currentMission ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                  <p className="text-white text-lg leading-relaxed">{currentMission.content}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${currentMission.completed ? 'text-green-400' : 'text-slate-400'}`}>
                    Status: {currentMission.completed ? 'Completed ✓' : 'In Progress'}
                  </span>
                  <button
                    onClick={toggleMissionComplete}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentMission.completed
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {currentMission.completed ? 'Mark Incomplete' : 'Mark Complete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No mission assigned for this phase yet.</p>
                <p className="text-sm text-slate-500">The Game Master will assign missions soon...</p>
              </div>
            )}
          </div>
        )}

        {/* Mission History */}
        {allMissions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Mission History</h2>
            <div className="space-y-3">
              {allMissions
                .sort((a, b) => b.day - a.day || (b.phase === 'NIGHT' ? 1 : -1))
                .map((mission) => (
                  <div
                    key={mission.id}
                    className={`p-4 rounded-lg border ${
                      mission.id === currentMission?.id
                        ? 'bg-purple-500/20 border-purple-500/40'
                        : 'bg-white/5 border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-slate-400">
                        Day {mission.day} - {mission.phase}
                        {mission.id === currentMission?.id && ' (Current)'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        mission.completed 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {mission.completed ? 'Completed' : 'Incomplete'}
                      </span>
                    </div>
                    <p className="text-white text-sm">{mission.content}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {gameData.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Game Not Started</h2>
            <p className="text-slate-300">Missions will be available once the game begins.</p>
          </div>
        )}

        {gameData.status === 'ENDED' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Game Ended</h2>
            <p className="text-slate-300">Check the story page for the complete mission history.</p>
            <Link 
              href={`/game/${gameId}/story`}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
            >
              View Game Story
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
