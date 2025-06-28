import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../../lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; missionId: string }> }
) {
  try {
    const { gameId, missionId } = await params
    const { playerId } = await request.json()
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verify the mission belongs to this player and game
    const mission = await prisma.playerMission.findUnique({
      where: { id: missionId },
      include: { game: true }
    })

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
    }

    if (mission.gameId !== gameId || mission.playerId !== playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Toggle completion status
    const updatedMission = await prisma.playerMission.update({
      where: { id: missionId },
      data: { completed: !mission.completed }
    })

    return NextResponse.json({ 
      mission: updatedMission,
      message: `Mission marked as ${updatedMission.completed ? 'completed' : 'incomplete'}`
    })
  } catch (error) {
    console.error('Error toggling mission:', error)
    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 })
  }
}
