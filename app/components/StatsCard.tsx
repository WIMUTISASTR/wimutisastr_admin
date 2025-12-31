import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
}

export default function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-amber-900 mt-2">{value}</p>
        </div>
        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}

