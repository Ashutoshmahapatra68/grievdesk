import React, { useState, useEffect } from 'react'
import { Users, Search, Phone, Home, Shield, PhoneOff } from 'lucide-react'
import { userApi } from '@/api/userApi'
import { Badge } from '@/components/common/Badge'

export function ResidentDirectory() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [blockFilter, setBlockFilter] = useState('all')

  useEffect(() => {
    userApi.getDirectory('approved')
      .then((res) => setUsers(res.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const blocks = Array.from(new Set(users.map((u) => u.block_no).filter(Boolean))).sort()

  const filtered = users.filter((u) => {
    if (blockFilter !== 'all' && u.block_no !== blockFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (u.name || '').toLowerCase().includes(q)
      const matchFlat = (u.flat_no || '').toLowerCase().includes(q)
      const matchBlock = (u.block_no || '').toLowerCase().includes(q)
      if (!matchName && !matchFlat && !matchBlock) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Directory</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Connect with neighbors and contact committee members. Residents only see phone numbers shared publicly.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, flat, block…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white"
          />
        </div>

        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-blue-600"
        >
          <option value="all">All Blocks</option>
          {blocks.map((b) => (
            <option key={b} value={b}>
              Block {b}
            </option>
          ))}
        </select>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No residents match criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting search or block filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-card space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                      {member.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{member.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Home className="w-3 h-3 text-slate-400" /> Block {member.block_no} · Flat {member.flat_no}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <Badge variant={member.role} size="sm" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {member.phone ? (
                  <a
                    href={`tel:${member.phone}`}
                    className="flex items-center gap-1.5 text-blue-600 font-semibold hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{member.phone}</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Private</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
