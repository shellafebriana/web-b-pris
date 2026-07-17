import prisma from '@/lib/prisma'

export async function getAllReportFormatsList() {
  const formats = await prisma.reportFormat.findMany({ orderBy: { id: 'asc' } })
  return formats.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    isActive: f.isActive,
    config: f.config,
  }))
}

export async function getReportFormatById(id) {
  const format = await prisma.reportFormat.findUnique({ where: { id } })
  if (!format) return null
  return {
    id: format.id,
    name: format.name,
    description: format.description,
    template: format.template,
    config: format.config,
    isActive: format.isActive,
  }
}

export async function createReportFormat({ id, name, description, template, config, isActive }) {
  if (!id) throw new Error('ID format harus diisi')
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('ID cuma boleh huruf kecil, angka, dan tanda strip')
  if (!name) throw new Error('Nama format harus diisi')
  if (!template) throw new Error('Template harus diisi')

  try {
    const format = await prisma.reportFormat.create({
      data: { id, name, description: description || null, template, config, isActive: isActive !== false },
    })
    return { id: format.id }
  } catch (error) {
    if (error.code === 'P2002') throw new Error('ID format ini sudah dipakai')
    throw error
  }
}

export async function updateReportFormat(id, { name, description, template, config, isActive }) {
  const format = await prisma.reportFormat.update({
    where: { id },
    data: {
      name: name || undefined,
      description: description !== undefined ? (description || null) : undefined,
      template: template || undefined,
      config: config || undefined,
      isActive,
    },
  })
  return { id: format.id }
}

export async function deleteReportFormat(id) {
  await prisma.reportFormat.delete({ where: { id } })
}