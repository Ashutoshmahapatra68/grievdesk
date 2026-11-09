import React from 'react'

export function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-12 bg-slate-200/60 rounded-xl w-full"
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-3">
      <div className="h-4 bg-slate-200/70 rounded w-1/3" />
      <div className="h-8 bg-slate-200 rounded w-1/2" />
      <div className="h-3 bg-slate-200/50 rounded w-2/3" />
    </div>
  )
}
