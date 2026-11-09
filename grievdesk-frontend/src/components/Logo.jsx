import React from 'react'
import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SOCIETY_NAME } from '@/lib/constants'

export function Logo({ subtitle, light = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
          light
            ? 'bg-blue-600 text-white'
            : 'bg-slate-900 text-white'
        }`}
      >
        <Building2 className="w-5 h-5 text-white" />
      </div>
      <div className="leading-tight min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-black text-base tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
            Griev<span className="text-blue-500">Desk</span>
          </span>
        </div>
        <p className={`text-xs truncate max-w-[150px] ${light ? 'text-slate-400' : 'text-slate-500'}`}>
          {subtitle || SOCIETY_NAME}
        </p>
      </div>
    </Link>
  )
}
