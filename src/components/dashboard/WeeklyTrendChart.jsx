'use client'

import React from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded text-sm">
        <p className="font-medium">{data.period}</p>
        <p className="text-blue-300">Total: {data.count.toLocaleString('id-ID')}</p>
        {data.percentage !== null && (
          <p className={data.percentage > 0 ? 'text-green-300' : 'text-red-300'}>
            {data.percentage > 0 ? '↑' : '↓'} {Math.abs(data.percentage)}%
          </p>
        )}
      </div>
    )
  }
  return null
}

const WeeklyTrendChart = ({ data }) => {
  // Check if data is null atau empty
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
          Perbandingan Total Amplifikasi Mingguan
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Tidak ada data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 dark:bg-gray-800">
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
        Perbandingan Total Amplifikasi Mingguan
      </h3>

      {/* Chart */}
      <div className="h-[220px] sm:h-[280px] lg:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              dataKey="count" 
              fill="#3b82f6" 
              name="Total Link"
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
            
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              name="Perbandingan"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default WeeklyTrendChart