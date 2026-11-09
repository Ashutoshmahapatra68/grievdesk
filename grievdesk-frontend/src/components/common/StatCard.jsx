import React from 'react'

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  color = 'blue',
  onClick,
}) {
  const colorStyles = {
    blue: 'bg-blue-50/80 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50/80 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50/80 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50/80 text-amber-600 border-amber-100',
    rose: 'bg-rose-50/80 text-rose-600 border-rose-100',
    purple: 'bg-purple-50/80 text-purple-600 border-purple-100',
    navy: 'bg-slate-100 text-slate-800 border-slate-200',
  }

  const activeColor = colorStyles[color] || colorStyles.blue

  return (
    <div
      onClick={onClick}
      className={`relative bg-card border border-border/80 rounded-2xl p-5 shadow-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-elevation' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</h3>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  trendPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 p-3 rounded-xl border ${activeColor}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
