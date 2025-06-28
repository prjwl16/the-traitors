'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface RoomLogEntry {
  id: string
  content: string
  phase: 'DAY' | 'NIGHT'
  day: number
  createdAt: string
}

export default function RoomLogPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [logs, setLogs] = useState<RoomLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/room/log`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch room logs')
      }

      setLogs(data.logs)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId) {
      fetchLogs()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getPhaseIcon = (phase: string) => {
    return phase === 'DAY' ? '☀️' : '🌙'
  }

  const getPhaseColor = (phase: string) => {
    return phase === 'DAY' 
      ? 'border-yellow-500/40 bg-yellow-500/10' 
      : 'border-blue-500/40 bg-blue-500/10'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading room log...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">📜 Room of Secrets Log</h1>
              <p className="text-slate-300">Chronicle of mysterious happenings</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href={`/game/${gameId}/room`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                🏛️ Back to Room
              </Link>
              <Link 
                href={`/game/${gameId}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Back to Game
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Room Log Entries */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Mysterious Events</h2>
          
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">The room remains undisturbed...</p>
              <p className="text-slate-500 text-sm">No interactions have occurred yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${getPhaseColor(log.phase)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPhaseIcon(log.phase)}</span>
                      <span className="text-white font-medium">
                        Day {log.day} - {log.phase}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-slate-200 leading-relaxed italic">
                    "{log.content}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">About the Room Log</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p>• This log records all interactions with objects in the Room of Secrets</p>
            <p>• Entries are written in symbolic language to maintain mystery</p>
            <p>• The identity of who performed each action remains hidden</p>
            <p>• Use this information to deduce patterns and player intentions</p>
            <p>• Traitors may leave subtle clues through their object interactions</p>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Symbol Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">☀️</span>
                <span className="text-white">Day Phase Events</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌙</span>
                <span className="text-white">Night Phase Events</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💥</span>
                <span className="text-white">Object Destroyed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <span className="text-white">Item Placed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span className="text-white">Object Cleaned</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👁️</span>
                <span className="text-white">Object Observed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile bottom padding */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}
