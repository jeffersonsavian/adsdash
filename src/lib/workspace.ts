import { prisma } from './prisma'

export async function getWorkspaceOrFail(slug: string, userId: string) {
  // Superadmin bypasses workspace membership check — can access any workspace
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user?.role === 'superadmin') {
    const workspace = await prisma.workspace.findUnique({ where: { slug } })
    if (!workspace) throw new Error('Workspace não encontrado')
    return workspace
  }

  const workspaceUser = await prisma.workspaceUser.findFirst({
    where: {
      workspace: { slug },
      userId,
    },
    include: { workspace: true },
  })

  if (!workspaceUser) {
    throw new Error('Workspace não encontrado ou sem acesso')
  }

  return workspaceUser.workspace
}
