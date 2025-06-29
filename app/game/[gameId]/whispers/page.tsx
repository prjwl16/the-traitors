'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  isAlive: boolean
}

interface Whisper {
  id: string
  fromPlayerId: string
  fromPlayerName?: string
  toPlayerId: string
  toPlayerName?: string
  content: string
  phase: 'DAY' | 'NIGHT'
  day: number
  isLeaked: boolean
  createdAt: string
}

interface GameData {
  id: string
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  status: 'WAITING' | 'PLAYING' | 'ENDED'
  currentPlayerId: string
  players: Player[]
}

export default function WhispersPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [sentWhispers, setSentWhispers] = useState<Whisper[]>([])
  const [receivedWhispers, setReceivedWhispers] = useState<Whisper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const fetchData = async () => {
    try {
      // Fetch game data first to get the current player ID
      const gameResponse = await fetch(`/api/games/${gameId}`)
      const gameData = await gameResponse.json()

      if (!gameResponse.ok) {
        throw new Error(gameData.error || 'Failed to fetch game data')
      }

      setGameData(gameData)

      // Get the current player ID from the game data (this is already validated by the API)
      const currentPlayerId = gameData.currentPlayerId
      if (!currentPlayerId) {
        throw new Error('You are not a player in this game')
      }

      // Fetch whispers using the validated player ID
      const whispersResponse = await fetch(`/api/games/${gameId}/whispers?playerId=${currentPlayerId}`)
      const whispersData = await whispersResponse.json()

      if (!whispersResponse.ok) {
        throw new Error(whispersData.error || 'Failed to fetch whispers')
      }

      setSentWhispers(whispersData.sent || [])
      setReceivedWhispers(whispersData.received || [])
      
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId) {
      fetchData()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId])

  const sendWhisper = async () => {
    if (!selectedRecipient || !message.trim()) {
      setError('Please select a recipient and enter a message')
      return
    }

    if (!gameData?.currentPlayerId) {
      setError('Unable to identify current player')
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await fetch(`/api/games/${gameId}/whispers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPlayerId: gameData.currentPlayerId,
          toPlayerId: selectedRecipient,
          content: message.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send whisper')
      }

      setMessage('')
      setSelectedRecipient('')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send whisper')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading whispers...</div>
      </div>
    )
  }

  if (error && !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
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

  const currentPlayer = gameData?.players.find(p => p.id === gameData.currentPlayerId)
  const otherAlivePlayers = gameData?.players.filter(p => p.isAlive && p.id !== gameData.currentPlayerId) || []
  
  // Check if player has already sent a whisper this phase
  const hasWhisperedThisPhase = sentWhispers.some(
    w => w.phase === gameData?.currentPhase && w.day === gameData?.currentDay
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">💬 Secret Whispers</h1>
              <p className="text-slate-300">Day {gameData?.currentDay} - {gameData?.currentPhase} Phase</p>
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

        {/* Send Whisper */}
        {gameData?.status === 'PLAYING' && currentPlayer?.isAlive && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Send Anonymous Whisper</h2>
            {hasWhisperedThisPhase ? (
              <div className="text-center py-8">
                <p className="text-yellow-400 mb-2">📝 You have already sent a whisper this phase</p>
                <p className="text-slate-400 text-sm">You can send one whisper per phase. Wait for the next phase to send another.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Send to:</label>
                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    disabled={sending}
                  >
                    <option value="">Select a player...</option>
                    {otherAlivePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">
                    Message ({message.length}/140):
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                    placeholder="Type your anonymous message..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 resize-none"
                    rows={3}
                    disabled={sending}
                  />
                </div>
                
                <button
                  onClick={sendWhisper}
                  disabled={!selectedRecipient || !message.trim() || sending}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium"
                >
                  {sending ? 'Sending...' : 'Send Anonymous Whisper'}
                </button>
                
                <p className="text-slate-400 text-sm">
                  ⚠️ Your whisper will be delivered anonymously. The recipient won't know who sent it.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Received Whispers */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📨 Received Whispers</h2>
          {receivedWhispers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No whispers received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedWhispers
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((whisper) => (
                  <div
                    key={whisper.id}
                    className={`p-4 rounded-lg border ${
                      whisper.isLeaked 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-white/5 border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-slate-400">
                        Anonymous • Day {whisper.day} - {whisper.phase}
                        {whisper.isLeaked && ' • ⚠️ LEAKED'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(whisper.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white">{whisper.content}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Sent Whispers History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📤 Your Sent Whispers</h2>
          {sentWhispers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No whispers sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentWhispers
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((whisper) => (
                  <div
                    key={whisper.id}
                    className={`p-4 rounded-lg border ${
                      whisper.isLeaked 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-white/5 border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-slate-400">
                        To: {whisper.toPlayerName} • Day {whisper.day} - {whisper.phase}
                        {whisper.isLeaked && ' • ⚠️ LEAKED TO PUBLIC'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(whisper.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white">{whisper.content}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {gameData?.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Game Not Started</h2>
            <p className="text-slate-300">Whispers will be available once the game begins.</p>
          </div>
        )}

        {gameData?.status === 'ENDED' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Game Ended</h2>
            <p className="text-slate-300">All whispers are now part of history.</p>
            <Link 
              href={`/game/${gameId}/reveal`}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
            >
              View Final Reveal
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
