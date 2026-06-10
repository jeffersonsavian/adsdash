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

// Exige papel elevado (superadmin global ou owner do workspace).
// Usado em telas administrativas/de depuração. Retorna { workspace, role }.
export async function getWorkspaceForAdminOrFail(slug: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user?.role === 'superadmin') {
    const workspace = await prisma.workspace.findUnique({ where: { slug } })
    if (!workspace) throw new Error('Workspace não encontrado')
    return { workspace, role: 'superadmin' as const }
  }

  const workspaceUser = await prisma.workspaceUser.findFirst({
    where: { workspace: { slug }, userId },
    include: { workspace: true },
  })

  if (!workspaceUser || workspaceUser.role !== 'owner') {
    throw new Error('Acesso negado')
  }

  return { workspace: workspaceUser.workspace, role: workspaceUser.role }
}

// Valida acesso ao workspace com verificação de role mínimo.
// Superadmin bypassa verificação de role.
// Lança erro se usuário não tem acesso ou role insuficiente.
export async function getWorkspaceWithRoleOrFail(
  slug: string,
  userId: string,
  minRoles: Array<'owner' | 'manager'>
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })

  // Superadmin bypassa verificação de role
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

  if (!minRoles.includes(workspaceUser.role as 'owner' | 'manager')) {
    throw Object.assign(new Error('Acesso negado'), { code: 'INSUFFICIENT_ROLE' })
  }

  return workspaceUser.workspace
}
