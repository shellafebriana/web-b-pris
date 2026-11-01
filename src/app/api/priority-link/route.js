import { cekAuth, ok, okDaftar, gagal, bacaJson } from '@/lib/api-route'
import { getAllPriorityLinksList, createPriorityLink } from '@/lib/models/priorityLink'

// Link prioritas = master data: diambil semua (urut prioritas), filter di memori.
export async function GET(req) {
  const auth = cekAuth(req)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    const isActive = searchParams.get('isActive')

    const links = (await getAllPriorityLinksList()).filter(
      (l) =>
        (!search ||
          l.keyword.toLowerCase().includes(search) ||
          (l.description ?? '').toLowerCase().includes(search)) &&
        (isActive === null || l.isActive === (isActive === 'true'))
    )
    return okDaftar(links, 'Data link prioritas berhasil diambil', { total: links.length })
  } catch (error) {
    return gagal(error, 'GET PriorityLink')
  }
}

export async function POST(req) {
  const auth = cekAuth(req, { wajibAdmin: true })
  if (auth.error) return auth.error

  try {
    const { keyword, description, isActive } = await bacaJson(req)
    const link = await createPriorityLink({ keyword, description, isActive })
    return ok(link, 'Link prioritas berhasil dibuat', 201)
  } catch (error) {
    return gagal(error, 'POST PriorityLink')
  }
}