import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getBulanTersedia, getSesiPerBulan } from '@/lib/models/monitoring'
import { getDayRange } from '@/lib/date-helpers'
import MonitoringSesiList from '@/components/monitoring/MonitoringSesiList'
import Link from 'next/link'

function bulanIni() {
  const { startOfDay } = getDayRange()
  return new Date(startOfDay.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7)
}

export default async function MonitoringPage({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const params = await searchParams
  const daftarBulan = await getBulanTersedia()

  // Whitelist: hanya terima bulan yang benar-benar ada datanya, atau bulan ini.
  const bulanDefault = bulanIni()
  const diminta = params?.bulan
  const bulan =
    typeof diminta === 'string' && /^\d{4}-\d{2}$/.test(diminta) &&
    (daftarBulan.includes(diminta) || diminta === bulanDefault)
      ? diminta
      : (daftarBulan[0] ?? bulanDefault)

  const { hasil, ringkas } = await getSesiPerBulan(bulan)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-gray-800 dark:text-white">
            Monitoring Media
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pemantauan media online dan media sosial harian
          </p>
        </div>
        <Link
          href="/monitoring/kandidat"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Antrean kandidat
        </Link>
      </div>

      <MonitoringSesiList
        daftar={hasil}
        ringkas={ringkas}
        bulan={bulan}
        daftarBulan={daftarBulan.includes(bulanDefault) ? daftarBulan : [bulanDefault, ...daftarBulan]}
      />
    </div>
  )
}