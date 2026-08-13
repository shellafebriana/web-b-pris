import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/models/dashboard'
import { getMonitoringOverview } from '@/lib/models/monitoring'
import DashboardCard from '@/components/dashboard/DashboardCard'
import MonitoringCard from '@/components/dashboard/MonitoringCard'
import IsuDisorotCard from '@/components/dashboard/IsuDisorotCard'
import MediaTeratasCard from '@/components/dashboard/MediaTeratasCard'
import SentimenPolriCard from '@/components/dashboard/SentimenPolriCard'
import HeatmapChart from '@/components/dashboard/HeatmapChart'
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart'
import UnitRankingTable from '@/components/dashboard/UnitRankingTable'
import PlatformRankingTable from '@/components/dashboard/PlatformRankingTable'

// Whitelist: jangan percaya nilai dari URL, hanya terima yang terdaftar.
const ISU_HARI_VALID = [1, 7, 30]

export default async function Dashboard({ searchParams }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  const sp = await searchParams
  const isuHariRaw = Number(sp?.isuHari)
  const isuHari = ISU_HARI_VALID.includes(isuHariRaw) ? isuHariRaw : 7

  const [
    { stats, unitRankingSocial, unitRankingOnline, platformRanking, heatmap, weeklyTrend },
    monitoring,
  ] = await Promise.all([
    getDashboardOverview(),
    getMonitoringOverview({ isuHari }),
  ])

  return (
    <>
      <DashboardCard data={stats} />

      <div className="mt-4 md:mt-6">
        <MonitoringCard data={monitoring.ringkasan} />

        <div className="mt-4 md:mt-6">
          <IsuDisorotCard data={monitoring.isu} hariAktif={isuHari} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-2 md:gap-6">
          <MediaTeratasCard data={monitoring.media} />
          <SentimenPolriCard data={monitoring.sentimen} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 mt-8">
        <HeatmapChart data={heatmap} />
        <WeeklyTrendChart data={weeklyTrend} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 mt-6">
        <UnitRankingTable data={unitRankingSocial} title="Keaktifan Polsek dalam Amplifikasi Media Sosial" />
        <UnitRankingTable data={unitRankingOnline} title="Keaktifan Polsek dalam Amplifikasi Media Online" />
      </div>

      <div className="mt-6">
        <PlatformRankingTable data={platformRanking} />
      </div>
    </>
  );
}