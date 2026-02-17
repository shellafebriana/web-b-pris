"use client";
import DashboardCard from "@/components/dashboard/DashboardCard";
import HeatmapChart from '@/components/dashboard/HeatmapChart';
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart';
import UnitRankingTable from '@/components/dashboard/UnitRankingTable';
import PlatformRankingTable from '@/components/dashboard/PlatformRankingTable';
import React from "react";
import { useState, useEffect } from 'react';
import { api } from "@/lib/api-client";


export default function Dashboard() {
  // State untuk 5 endpoint
  const [dashboardStats, setDashboardStats] = useState(null)
  const [unitRanking, setUnitRanking] = useState(null)
  const [platformRanking, setPlatformRanking] = useState(null)
  const [heatmapData, setHeatmapData] = useState(null)
  const [weeklyTrend, setWeeklyTrend] = useState(null)
  
  // State untuk loading & error
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch semua data
  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch 5 endpoint sekaligus
      const [stats, units, platforms, heatmap, weekly] = await Promise.all([
        api.getDashboardStats(),        // Endpoint 1
        api.getDashboardUnitRanking(),  // Endpoint 2
        api.getDashboardPlatformRanking(), // Endpoint 3
        api.getDashboardHeatMap(),      // Endpoint 4
        api.getDashboardWeeklyTrend()   // Endpoint 5
      ])
      
      setDashboardStats(stats.data.data)
      setUnitRanking(units.data.data)
      setPlatformRanking(platforms.data.data)
      setHeatmapData(heatmap.data.data)
      setWeeklyTrend(weekly.data.data)
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch saat page load
  useEffect(() => {
    fetchAllData()
  }, [])
  
  // Auto-refresh setiap 5 menit
  useEffect(() => {
    const interval = setInterval(fetchAllData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  
  return (
    <>
      <DashboardCard data={dashboardStats} />

      <div className="grid grid-cols-2 gap-6 mt-6">
        <HeatmapChart data={heatmapData} />
        <WeeklyTrendChart data={weeklyTrend} />
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <UnitRankingTable data={unitRanking} />
        <PlatformRankingTable data={platformRanking} />
      </div>
    </>
  );
}