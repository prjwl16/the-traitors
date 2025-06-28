import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    const missions = await prisma.playerMission.findMany({
      where: {
        gameId,
        playerId
      },
      orderBy: [
        { day: 'desc' },
        { phase: 'desc' }
      ]
    })

    return NextResponse.json({ missions })
  } catch (error) {
    console.error('Error fetching missions:', error)
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }
}
