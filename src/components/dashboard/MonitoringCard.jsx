import { DocsIcon, GlobeIcon, MobilePhoneIcon, ListIcon } from '@/icons'
import { formatNumber } from '@/lib/format-number'

// Server Component. Tidak ada state, tidak butuh JS di klien — kartu tetap
// tampil walau bundle belum turun.

function jamWib(iso) {
  if (!iso) return null
  const geser = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(geser.getUTCHours())}.${p(geser.getUTCMinutes())} WIB`
}

const MonitoringCard = ({ data }) => {
  const d = data ?? {}

  const statusTeks = !d.adaSesi ? 'Belum ada' : d.state === 'final' ? 'Final' : 'Draft'
  const statusWarna = !d.adaSesi
    ? 'text-gray-400 dark:text-gray-500'
    : d.state === 'final'
      ? 'text-success-600 dark:text-success-500'
      : 'text-warning-600 dark:text-warning-500'

  const cards = [
    {
      id: 'sesi',
      title: 'Sesi Monitoring Hari Ini',
      nilai: statusTeks,
      nilaiKelas: statusWarna,
      catatan: d.adaSesi
        ? `${formatNumber(d.totalItem)} item${d.perluReview > 0 ? ` · ${formatNumber(d.perluReview)} perlu review` : ''}`
        : 'Belum dibuat',
      icon: 'DocsIcon',
    },
    {
      id: 'online',
      title: 'Monitoring Media Online Hari Ini',
      nilai: formatNumber(d.totalOnline ?? 0),
      catatan:
        d.antreanBaru > 0 ? `dari ${formatNumber(d.antreanBaru)} kandidat` : 'input manual',
      icon: 'GlobeIcon',
    },
    {
      id: 'sosmed',
      title: 'Monitoring Media Sosial Hari Ini',
      nilai: formatNumber(d.totalSosmed ?? 0),
      catatan: 'input manual',
      icon: 'MobilePhoneIcon',
    },
    {
      id: 'antrean',
      title: 'Antrean Monitoring Belum Disaring',
      nilai: formatNumber(d.antreanBaru ?? 0),
      nilaiKelas: d.antreanBaru > 0 ? 'text-brand-600 dark:text-brand-400' : undefined,
      catatan: d.ditarikPada ? `ditarik ${jamWib(d.ditarikPada)}` : 'crawler belum jalan',
      icon: 'ListIcon',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {card.icon === 'DocsIcon' && <DocsIcon className="text-gray-800 size-6 dark:text-white" />}
            {card.icon === 'GlobeIcon' && <GlobeIcon className="text-gray-800 size-6 dark:text-white" />}
            {card.icon === 'MobilePhoneIcon' && (
              <MobilePhoneIcon className="text-gray-800 size-6 dark:text-white" />
            )}
            {card.icon === 'ListIcon' && <ListIcon className="text-gray-800 size-6 dark:text-white" />}
          </div>

          <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{card.title}</span>
            <h4
              className={`mt-2 font-bold text-title-sm ${card.nilaiKelas ?? 'text-gray-800 dark:text-white'}`}
            >
              {card.nilai}
            </h4>
            {card.catatan ? (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{card.catatan}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MonitoringCard