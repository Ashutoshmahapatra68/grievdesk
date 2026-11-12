import React, { useState, useEffect } from 'react'
import { Megaphone, Pin, Search, Calendar, User, Clock } from 'lucide-react'
import { announcementApi } from '@/api/announcementApi'

export function ResidentAnnouncements() {
  const [pinned, setPinned] = useState([])
  const [general, setGeneral] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    announcementApi.listAnnouncements({ limit: 50 })
      .then((res) => {
        setPinned(res.pinned || [])
        setGeneral(res.general || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filterList = (list) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (a) => (a.title || '').toLowerCase().includes(q) || (a.message || '').toLowerCase().includes(q)
    )
  }

  const filteredPinned = filterList(pinned)
  const filteredGeneral = filterList(general)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Announcements</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Official notices, maintenance schedules, and community updates from management.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search announcements…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-6 shadow-card animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {filteredPinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Pin className="w-3.5 h-3.5 fill-current text-amber-600" />
                <span>Pinned Urgent Notices</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPinned.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-card space-y-2.5 relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-slate-900 text-base">{ann.title}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800 shrink-0">
                        Pinned
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {ann.message}
                    </p>
                    <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between text-xs text-amber-900/70">
                      <span>Posted by {ann.posted_by || ann.posted_by_name || 'Management'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent Notices ({filteredGeneral.length})
            </h3>
            {filteredGeneral.length === 0 && filteredPinned.length === 0 ? (
              <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 text-base">No announcements available</h4>
                <p className="text-xs text-slate-500 mt-1">There are no notices published at this moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGeneral.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-card border border-border/80 rounded-2xl p-5 shadow-card space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-bold text-slate-900 text-base">{ann.title}</h4>
                      <span className="text-xs text-slate-400 shrink-0">
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {ann.message}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Posted by: {ann.posted_by || ann.posted_by_name || 'Management Office'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
