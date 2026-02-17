'use client'

import React, { useState } from 'react'

// Transform data ke calendar grid
const transformToCalendar = (data, month, year) => {
  const dataMap = {}
  data.forEach(item => {
    dataMap[item.date] = item.count
  })
  
  const calendar = []
  const firstDay = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()
  
  let day = 1
  
  for (let week = 0; week < 5; week++) {
    const row = []
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (week === 0 && dayOfWeek < firstDay) {
        row.push(null)
      } else if (day > lastDay) {
        row.push(null)
      } else {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const count = dataMap[dateStr] || 0
        row.push({
          date: dateStr,
          day,
          count
        })
        day++
      }
    }
    
    calendar.push(row)
  }
  
  return calendar
}

// Get color by intensity (10 level)
const getColorByIntensity = (count, maxCount) => {
  const colors = [
    'bg-white',
    'bg-blue-50',
    'bg-blue-100',
    'bg-blue-200',
    'bg-blue-300',
    'bg-blue-400',
    'bg-blue-500',
    'bg-blue-600',
    'bg-blue-700',
    'bg-blue-800',
  ]
  
  if (count === 0) return colors[0]
  
  const level = Math.ceil((count / maxCount) * 9)
  return colors[Math.min(level, 9)]
}

// Get text color based on intensity
const getTextColorByIntensity = (count, maxCount) => {
  if (count === 0) return 'text-gray-800 dark:text-black'
  
  // Calculate intensity level
  const level = Math.ceil((count / maxCount) * 9)
  
  // Light background (level 0-3) → dark text
  if (level <= 3) {
    return 'text-gray-800 dark:text-black'
  }
  // Dark background (level 4-9) → white text (light mode) / black text (dark mode)
  else {
    return 'text-white dark:text-white'
  }
}

const HeatmapChart = ({ data }) => {
  
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
          Kalender Amplifikasi {new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Tidak ada data
        </div>
      </div>
    )
  }
  const [hoveredCell, setHoveredCell] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  
  const calendar = transformToCalendar(data, month, year)
  const maxCount = Math.max(...data.map(d => d.count), 1)
  
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  
  const handleCellHover = (e, cell) => {
    if (!cell) return
    setHoveredCell(cell)
    setTooltipPos({
      x: e.clientX,
      y: e.clientY
    })
  }
  
  const handleCellLeave = () => {
    setHoveredCell(null)
  }
  
  return (
    <div className="bg-white rounded-lg p-6 dark:bg-gray-800">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
        Kalender Amplifikasi {new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
      </h3>
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-300 h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {calendar.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((cell, dayIdx) => (
                <div
                  key={dayIdx}
                  onMouseEnter={(e) => handleCellHover(e, cell)}
                  onMouseLeave={handleCellLeave}
                  className={`h-10 rounded cursor-pointer transition-all ${
                    cell === null ? 'bg-transparent' : `${getColorByIntensity(cell.count, maxCount)} hover:ring-2 hover:ring-offset-1`
                  }`}
                >
                  {cell && (
                    <div className={`flex items-center justify-center h-full text-xs font-medium ${getTextColorByIntensity(cell.count, maxCount)}`}>
                      {cell.day}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {hoveredCell && (
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded text-sm z-50 pointer-events-none"
          style={{
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y + 10}px`
          }}
        >
          <div>{hoveredCell.date}</div>
          <div className="text-xs text-gray-300">{hoveredCell.count} link</div>
        </div>
      )}
      
      <div className="mt-6 flex items-center gap-4 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Minimal</span>
        <div className="flex gap-1">
          {['bg-white', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800'].map((color, idx) => (
            <div key={idx} className={`w-3 h-3 rounded border border-gray-300 ${color}`} />
          ))}
        </div>
        <span className="text-gray-600 dark:text-gray-400">Maksimal</span>
      </div>
    </div>
  )
}

export default HeatmapChart;