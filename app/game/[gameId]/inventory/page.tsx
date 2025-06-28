'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface PersonalItem {
  id: string
  name: string
}

interface PlacedItem {
  itemName: string
  roomObject: { name: string }
}

interface InventoryData {
  game: {
    id: string
    currentPhase: 'DAY' | 'NIGHT'
    currentDay: number
    status: string
  }
  personalItems: PersonalItem[]
  placedItems: PlacedItem[]
}

export default function InventoryPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
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

  const fetchInventoryData = async () => {
    if (!playerId) return

    try {
      const response = await fetch(`/api/games/${gameId}/room?playerId=${playerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory data')
      }

      setInventoryData(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gameId && playerId) {
      fetchInventoryData()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchInventoryData, 5000)
      return () => clearInterval(interval)
    }
  }, [gameId, playerId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading inventory...</div>
      </div>
    )
  }

  if (error && !inventoryData) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">🎒 Personal Inventory</h1>
              <p className="text-slate-300">Your mysterious belongings</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href={`/game/${gameId}/room`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                🏛️ Room of Secrets
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

        {/* Available Items */}
        {inventoryData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Available Items</h2>
            {inventoryData.personalItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-2">All your items have been placed in the room.</p>
                <p className="text-slate-500 text-sm">Visit the Room of Secrets to see where they are.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryData.personalItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💎</span>
                      <div>
                        <h3 className="text-white font-medium">{item.name}</h3>
                        <p className="text-green-400 text-sm">Ready to place</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {inventoryData.personalItems.length > 0 && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Tip:</strong> Visit the Room of Secrets to place these items strategically. 
                  Each placement sends a subtle message to other players.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Placed Items */}
        {inventoryData && inventoryData.placedItems.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Items You've Placed</h2>
            <div className="space-y-3">
              {inventoryData.placedItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔮</span>
                      <div>
                        <h3 className="text-white font-medium">{item.itemName}</h3>
                        <p className="text-purple-400 text-sm">Placed in: {item.roomObject.name}</p>
                      </div>
                    </div>
                    <span className="text-purple-300 text-sm">Placed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How Personal Items Work</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p>• Each player starts with 4 unique personal items</p>
            <p>• Items can be placed into any object in the Room of Secrets</p>
            <p>• Placement is permanent and visible to all players</p>
            <p>• Use strategic placement to send messages or create misdirection</p>
            <p>• Traitors may receive missions involving specific item placements</p>
          </div>
        </div>

        {inventoryData?.game.status === 'WAITING' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Items Sealed</h2>
            <p className="text-slate-300">Your personal items will be available once the game begins.</p>
          </div>
        )}

        {inventoryData?.game.status === 'ENDED' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Game Ended</h2>
            <p className="text-slate-300">All item placements are now part of the final story.</p>
            <Link 
              href={`/game/${gameId}/reveal`}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg inline-block"
            >
              View Final Reveal
            </Link>
          </div>
        )}
      </div>
      
      {/* Mobile bottom padding */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}
