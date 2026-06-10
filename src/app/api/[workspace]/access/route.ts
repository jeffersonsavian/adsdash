import { auth } from '@/lib/auth'
import { getWorkspaceForAdminOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Retorna se o usuário pode acessar telas administrativas/de depuração
// do workspace (superadmin global ou owner). Usado para gate do sidebar.
export async function GET(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ canDebug: false }, { status: 401 })
    }

    const { workspace } = await paramsPromise

    try {
      const { role } = await getWorkspaceForAdminOrFail(workspace, session.user.id)
      return NextResponse.json({ canDebug: true, role })
    } catch {
      return NextResponse.json({ canDebug: false })
    }
  } catch {
    return NextResponse.json({ canDebug: false }, { status: 500 })
  }
}
