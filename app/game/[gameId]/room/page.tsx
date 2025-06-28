'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface RoomObject {
  id: string
  name: string
  description: string
  state: 'UNTOUCHED' | 'PLACED' | 'DESTROYED' | 'CLEANED' | 'VISITED'
  lastAction?: string
  placedItems: Array<{
    itemName: string
    playerName: string
  }>
  canInteract: boolean
}

interface PersonalItem {
  id: string
  name: string
}

interface PlacedItem {
  itemName: string
  roomObject: { name: string }
}

interface RoomData {
  game: {
    id: string
    currentPhase: 'DAY' | 'NIGHT'
    currentDay: number
    status: string
  }
  roomObjects: RoomObject[]
  personalItems: PersonalItem[]
  placedItems: PlacedItem[]
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interacting, setInteracting] = useState(false)
  const [selectedObject, setSelectedObject] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<string>('')

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

  const fetchRoomData = async () => {
    if (!playerId) return

    try {
      const response = await fetch(`/api/games/${gameId}/room?playerId=${playerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch room data')
      }

      // If room objects are empty, try to initialize the room
      if (data.roomObjects && data.roomObjects.length === 0) {
        try {
          await fetch(`/api/games/${gameId}/room/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: playerId })
          })
          // Fetch again after initialization
          const retryResponse = await fetch(`/api/games/${gameId}/room?playerId=${playerId}`)
          const retryData = await retryResponse.json()
          if (retryResponse.ok) {
            setRoomData(retryData)
          } else {
            setRoomData(data)
          }
        } catch (initErr) {
          console.error('Failed to initialize room:', initErr)
          setRoomData(data)
        }
      } else {
        setRoomData(data)
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId && playerId) {
      fetchRoomData()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchRoomData, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId, playerId])

  const handleInteraction = async () => {
    if (!selectedObject || !selectedAction || interacting) return

    setInteracting(true)
    setError('')

    try {
      const response = await fetch(`/api/games/${gameId}/room/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          objectId: selectedObject,
          action: selectedAction,
          itemName: selectedAction === 'PLACE' ? selectedItem : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to interact with object')
      }

      // Reset selection and refresh data
      setSelectedObject(null)
      setSelectedAction('')
      setSelectedItem('')
      fetchRoomData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to interact with object')
    } finally {
      setInteracting(false)
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'UNTOUCHED': return 'border-slate-500/40 bg-slate-500/10'
      case 'PLACED': return 'border-purple-500/40 bg-purple-500/10'
      case 'DESTROYED': return 'border-red-500/40 bg-red-500/10'
      case 'CLEANED': return 'border-blue-500/40 bg-blue-500/10'
      case 'VISITED': return 'border-yellow-500/40 bg-yellow-500/10'
      default: return 'border-white/20 bg-white/5'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'UNTOUCHED': return '⚪'
      case 'PLACED': return '💎'
      case 'DESTROYED': return '💥'
      case 'CLEANED': return '✨'
      case 'VISITED': return '👁️'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Room of Secrets...</div>
      </div>
    )
  }

  if (error && !roomData) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">🏛️ Room of Secrets</h1>
              <p className="text-slate-300">Day {roomData?.game.currentDay} - {roomData?.game.currentPhase} Phase</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href={`/game/${gameId}/room/log`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                📜 Room Log
              </Link>
              <Link 
                href={`/game/${gameId}/inventory`}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                🎒 Inventory
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Personal Items Summary */}
        {roomData && roomData.personalItems.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">Your Available Items:</h3>
            <div className="flex flex-wrap gap-2">
              {roomData.personalItems.map((item) => (
                <span key={item.id} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Room Objects Grid */}
        {roomData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Mysterious Objects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomData.roomObjects.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-4 rounded-lg border transition-all ${getStateColor(obj.state)} ${
                    selectedObject === obj.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-medium">{obj.name}</h3>
                    <span className="text-xl">{getStateIcon(obj.state)}</span>
                  </div>
                  
                  <p className="text-slate-300 text-sm mb-3">{obj.description}</p>
                  
                  {obj.placedItems.length > 0 && (
                    <div className="mb-3">
                      <p className="text-purple-400 text-sm font-medium">Contains:</p>
                      {obj.placedItems.map((item, idx) => (
                        <p key={idx} className="text-purple-300 text-xs">
                          • {item.itemName}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 capitalize">
                      {obj.state.toLowerCase()}
                    </span>
                    
                    {obj.canInteract && roomData.game.status === 'PLAYING' && (
                      <button
                        onClick={() => setSelectedObject(selectedObject === obj.id ? null : obj.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        {selectedObject === obj.id ? 'Cancel' : 'Interact'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interaction Panel */}
        {selectedObject && roomData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-white font-medium mb-4">Choose Your Action</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {['DESTROY', 'CLEAN', 'VISIT', 'PLACE'].map((action) => (
                <button
                  key={action}
                  onClick={() => setSelectedAction(selectedAction === action ? '' : action)}
                  disabled={action === 'PLACE' && roomData.personalItems.length === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedAction === action
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {action === 'PLACE' ? '💎 Place Item' : 
                   action === 'DESTROY' ? '💥 Destroy' :
                   action === 'CLEAN' ? '✨ Clean' : '👁️ Observe'}
                </button>
              ))}
            </div>
            
            {selectedAction === 'PLACE' && roomData.personalItems.length > 0 && (
              <div className="mb-4">
                <label className="block text-white font-medium mb-2">Select Item to Place:</label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Choose an item...</option>
                  {roomData.personalItems.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              onClick={handleInteraction}
              disabled={!selectedAction || (selectedAction === 'PLACE' && !selectedItem) || interacting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium"
            >
              {interacting ? 'Processing...' : 'Perform Action'}
            </button>
          </div>
        )}

        {roomData?.game.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Room Sealed</h2>
            <p className="text-slate-300">The Room of Secrets will open once the game begins.</p>
          </div>
        )}

        {roomData?.game.status === 'ENDED' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Secrets Revealed</h2>
            <p className="text-slate-300">The game has ended. All mysteries are now laid bare.</p>
          </div>
        )}
      </div>
      
      {/* Mobile bottom padding */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}
