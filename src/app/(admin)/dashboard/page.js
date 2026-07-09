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

  const { stats, unitRanking, platformRanking, heatmap, weeklyTrend } =
    await getDashboardOverview()

  return (
    <>
      <DashboardCard data={stats} />

      <div className="grid grid-cols-2 gap-6 mt-6">
        <HeatmapChart data={heatmap} />
        <WeeklyTrendChart data={weeklyTrend} />
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <UnitRankingTable data={unitRanking} />
        <PlatformRankingTable data={platformRanking} />
      </div>
    </>
  );
}