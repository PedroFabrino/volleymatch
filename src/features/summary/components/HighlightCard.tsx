'use client'

import { LucideIcon } from 'lucide-react'

type HighlightCardProps = {
  title: string
  disabled?: boolean
  gradient: string
  shadow: string
  icon: LucideIcon
  onClick: () => void
  children: React.ReactNode
}

export default function HighlightCard({
  title,
  disabled,
  gradient,
  shadow,
  icon: Icon,
  onClick,
  children,
}: HighlightCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${gradient} rounded-3xl p-6 text-white ${shadow} relative overflow-hidden text-left transition hover:scale-105 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
      <div className="relative z-10">
        <h3 className="font-bold uppercase tracking-wider text-sm mb-4 opacity-80">{title}</h3>
        {children}
      </div>
    </button>
  )
}
