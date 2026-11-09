import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, AlertTriangle, Wrench, Megaphone, BookOpen, ArrowRight, Loader2 } from 'lucide-react'
import { searchApi } from '@/api/searchApi'
import { Badge } from '@/components/common/Badge'

export function ResidentSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim() || query.trim().length < 2) return

    setLoading(true)
    setHasSearched(true)
    try {
      const data = await searchApi.search(query.trim(), 20)
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const complaints = results?.results?.complaints || []
  const services = results?.results?.service_requests || []
  const announcements = results?.results?.announcements || []
  const rules = results?.results?.rules || []
  const totalResults = complaints.length + services.length + announcements.length + rules.length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Search</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Search across complaints, service requests, society notices, and community rules.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative">
        <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords (e.g. water, electricity, parking, noise)…"
          className="w-full pl-12 pr-28 py-3.5 text-sm bg-white border border-slate-300 rounded-2xl shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Scanning society database…</p>
        </div>
      )}

      {!loading && hasSearched && totalResults === 0 && (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
          <SearchIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No results found</h3>
          <p className="text-xs text-slate-500 mt-1">Try another keyword or broader search term.</p>
        </div>
      )}

      {!loading && results && totalResults > 0 && (
        <div className="space-y-6">
          {/* Complaints */}
          {complaints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Complaints ({complaints.length})
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {complaints.map((c) => (
                  <Link
                    key={c.id}
                    to={`/resident/complaints?id=${c.id}`}
                    className="p-4 bg-card border border-border/80 hover:border-blue-300 rounded-2xl shadow-card transition-all flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                          #{c.id} · {c.category || 'General'}
                        </span>
                        <Badge variant={c.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{c.translated_text}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Service Requests */}
          {services.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-500" /> Service Requests ({services.length})
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    to={`/resident/tickets?id=${s.id}`}
                    className="p-4 bg-card border border-border/80 hover:border-blue-300 rounded-2xl shadow-card transition-all flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 capitalize group-hover:text-blue-600 transition-colors">
                          #{s.id} · {s.service_type?.replace('_', ' ')}
                        </span>
                        <Badge variant={s.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{s.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-amber-500" /> Announcements ({announcements.length})
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {announcements.map((a) => (
                  <Link
                    key={a.id}
                    to="/resident/announcements"
                    className="p-4 bg-card border border-border/80 hover:border-blue-300 rounded-2xl shadow-card transition-all flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                        {a.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{a.message}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {rules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-500" /> Society Rules & Bylaws ({rules.length})
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {rules.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl shadow-card space-y-1"
                  >
                    <span className="text-[11px] font-bold text-purple-900 uppercase">
                      Rule Section {r.section}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{r.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
