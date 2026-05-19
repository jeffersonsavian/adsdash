import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace } = await paramsPromise
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')

    let where: any = { workspaceId: workspaceRecord.id }

    if (dateStart && dateEnd) {
      where.date = {
        gte: new Date(dateStart),
        lte: new Date(dateEnd),
      }
    }

    const annotations = await prisma.annotation.findMany({
      where,
      include: { createdBy: true },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ annotations })
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace } = await paramsPromise
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const body = await req.json()
    const { date, title, description, type } = body

    if (!date || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const annotation = await prisma.annotation.create({
      data: {
        workspaceId: workspaceRecord.id,
        date: new Date(date),
        title,
        description,
        type: type || 'note',
        createdById: session.user.id,
      },
      include: { createdBy: true },
    })

    return NextResponse.json({ annotation }, { status: 201 })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    )
  }
}
