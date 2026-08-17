import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getItemPerluReview } from '@/lib/models/monitoring'
import ReviewPanel from '@/components/monitoring/ReviewPanel'

export default async function ReviewPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const sp = await searchParams
  const page = Math.min(Math.max(Number(sp?.page) || 1, 1), 999)
  const bulan = typeof sp?.bulan === 'string' && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : null

  const { data, kategori, pagination } = await getItemPerluReview({ page, bulan })

  return (
    <div>
      <div className="mb-6">
        <Link href="/monitoring" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          &larr; Kembali ke Monitoring
        </Link>
        <h1 className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white">
          Perlu Review
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {pagination.total} item yang kategorinya belum dipastikan
          {bulan ? ` pada ${bulan}` : ''}
        </p>
      </div>

      <ReviewPanel
        data={data}
        kategori={kategori}
        pagination={pagination}
        bulan={bulan}
      />
    </div>
  )
}