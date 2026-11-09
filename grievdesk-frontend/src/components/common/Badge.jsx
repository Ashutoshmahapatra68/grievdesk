import React from 'react'

const VARIANT_MAP = {
  // Complaint & Service Statuses
  new: 'bg-blue-50 text-blue-700 border-blue-200/80',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200/80',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  escalated: 'bg-rose-50 text-rose-700 border-rose-200/80 font-medium',

  // Severity
  low: 'bg-slate-50 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/80',
  high: 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold',

  // Roles
  resident: 'bg-slate-100 text-slate-700 border-slate-200',
  committee: 'bg-blue-50 text-blue-700 border-blue-200',
  secretary: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',

  // Dues
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',

  // Bookings
  booked: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 line-through',

  // General Status
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
}

const LABELS = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  resident: 'Resident',
  committee: 'Committee Member',
  secretary: 'Secretary',
  paid: 'Paid',
  unpaid: 'Unpaid',
  booked: 'Confirmed',
  cancelled: 'Cancelled',
  approved: 'Approved',
  pending: 'Pending Approval',
}

export function Badge({ variant, children, className = '', size = 'md' }) {
  const key = (variant || '').toLowerCase()
  const style = VARIANT_MAP[key] || 'bg-slate-100 text-slate-700 border-slate-200'
  const text = children || LABELS[key] || variant

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase font-semibold ${sizeClasses} ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  )
}
