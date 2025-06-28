import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    
    const logs = await prisma.roomLog.findMany({
      where: { gameId },
      orderBy: [
        { day: 'desc' },
        { phase: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching room logs:', error)
    return NextResponse.json({ error: 'Failed to fetch room logs' }, { status: 500 })
  }
}
