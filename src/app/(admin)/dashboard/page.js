import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/models/dashboard'
import DashboardCard from '@/components/dashboard/DashboardCard'
import HeatmapChart from '@/components/dashboard/HeatmapChart'
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart'
import UnitRankingTable from '@/components/dashboard/UnitRankingTable'
import PlatformRankingTable from '@/components/dashboard/PlatformRankingTable'

export default async function Dashboard() {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  const { stats, unitRankingSocial, unitRankingOnline, platformRanking, heatmap, weeklyTrend } =
    await getDashboardOverview()

  return (
    <>
      <DashboardCard data={stats} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 mt-6">
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