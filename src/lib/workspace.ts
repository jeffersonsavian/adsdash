import { prisma } from './prisma'

export async function getWorkspaceOrFail(slug: string, userId: string) {
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
