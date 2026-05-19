'use client'

import { ReactNode } from 'react'

interface HubSectionCardProps {
  title: string
  description: string
  icon: ReactNode
  color?: 'navy' | 'gold' | 'green' | 'purple' | 'blue'
  onClick: () => void
}

const colorMap = {
  navy: { iconBg: 'bg-navy-50', iconText: 'text-navy-600' },
  gold: { iconBg: 'bg-gold-50', iconText: 'text-gold-700' },
  green: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
  blue: { iconBg: 'bg-sky-50', iconText: 'text-sky-600' },
}

export default function HubSectionCard({
  title,
  description,
  icon,
  color = 'navy',
  onClick,
}: HubSectionCardProps) {
  const colors = colorMap[color]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors.iconBg} ${colors.iconText} group-hover:opacity-90 transition-opacity`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1.5 font-heading group-hover:text-navy-800 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </button>
  )
}
