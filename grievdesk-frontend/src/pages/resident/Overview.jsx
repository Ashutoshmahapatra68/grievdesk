import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Ticket,
  Wallet,
  Megaphone,
  MessageSquarePlus,
  ArrowRight,
  CalendarDays,
  BookOpen,
  Sparkles,
  Clock,
  Pin,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ticketApi } from '@/api/ticketApi'
import { duesApi } from '@/api/duesApi'
import { announcementApi } from '@/api/announcementApi'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/common/Badge'
import { SOCIETY_NAME } from '@/lib/constants'

export function ResidentOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState([])
  const [serviceRequests, setServiceRequests] = useState([])
  const [duesSummary, setDuesSummary] = useState({ total_unpaid: '0', unpaid_count: 0 })
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState([])

  useEffect(() => {
    let mounted = true
    Promise.all([
      ticketApi.getMyTickets().catch(() => ({ complaints: [], service_requests: [] })),
      duesApi.getMyDues().catch(() => ({ total_unpaid: '0', unpaid_count: 0 })),
      announcementApi.listAnnouncements({ limit: 5 }).catch(() => ({ pinned: [], general: [] })),
    ]).then(([ticketsRes, duesRes, annRes]) => {
      if (!mounted) return
      setComplaints(ticketsRes.complaints || [])
      setServiceRequests(ticketsRes.service_requests || [])
      setDuesSummary({
        total_unpaid: duesRes.total_unpaid || '0',
        unpaid_count: duesRes.unpaid_count || 0,
      })
      setPinnedAnnouncements(annRes.pinned || [])
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const activeComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length
  const activeServicesCount = serviceRequests.filter((s) => s.status !== 'resolved').length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-elevation">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resident Portal · {SOCIETY_NAME}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Assigned to Block <span className="font-bold text-white">{user?.block_no}</span>, Flat{' '}
              <span className="font-bold text-white">{user?.flat_no}</span>. Everything is up to date.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/resident/ai-assistant?type=complaint"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Raise AI Complaint</span>
            </Link>
            <Link
              to="/resident/ai-assistant?type=service"
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              <span>Book Service</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Complaints"
          value={activeComplaintsCount}
          subtitle={`${complaints.length} total submitted`}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Service Requests"
          value={activeServicesCount}
          subtitle={`${serviceRequests.length} total tickets`}
          icon={Ticket}
          color="indigo"
        />
        <StatCard
          title="Maintenance Dues"
          value={`₹${duesSummary.total_unpaid}`}
          subtitle={duesSummary.unpaid_count > 0 ? `${duesSummary.unpaid_count} unpaid month(s)` : 'All dues cleared'}
          icon={Wallet}
          color={duesSummary.unpaid_count > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Pinned Notices"
          value={pinnedAnnouncements.length}
          subtitle="Community announcements"
          icon={Megaphone}
          color="blue"
        />
      </div>

      {/* Pinned Society Announcements (if any) */}
      {pinnedAnnouncements.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Pin className="w-4 h-4 text-amber-600 fill-current" />
            <span>Pinned Society Notices</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinnedAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm">
                <h4 className="font-bold text-slate-900 text-sm">{ann.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ann.message}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>By {ann.posted_by || ann.posted_by_name || 'Management'}</span>
                  <span>{ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/resident/ai-assistant"
          className="bg-card border border-border/80 rounded-2xl p-5 shadow-card hover:border-blue-400 hover:shadow-elevation transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
              AI Grievance Assistant
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Describe your issue by text or voice note. Gemini automatically categorizes and logs it for the committee.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
            Open Chatbot <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          to="/resident/amenities"
          className="bg-card border border-border/80 rounded-2xl p-5 shadow-card hover:border-blue-400 hover:shadow-elevation transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
              Amenity Booking
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Check real-time slot availability for clubhouse, gym, and party facilities, and manage your reservations.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            Reserve Facility <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          to="/resident/rules"
          className="bg-card border border-border/80 rounded-2xl p-5 shadow-card hover:border-blue-400 hover:shadow-elevation transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
              Community Bylaws
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ask AI about society rules, quiet hours, parking regulations, and renovation permissions in natural language.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
            Consult Rulebook <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Two Column Layout: Recent Complaints & Service Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">My Recent Complaints</h3>
              <p className="text-xs text-muted-foreground">Track resolution status & committee actions</p>
            </div>
            <Link
              to="/resident/complaints"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View All ({complaints.length})
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {complaints.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No complaints recorded. Everything is peaceful!
              </div>
            ) : (
              complaints.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to={`/resident/complaints?id=${c.id}`}
                  className="block p-3.5 rounded-xl border border-border/60 hover:border-blue-300 hover:bg-slate-50/60 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      #{c.id} · {c.category || 'General'}
                    </span>
                    <Badge variant={c.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">{c.translated_text}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                    </span>
                    <Badge variant={c.severity} size="sm" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Service Requests */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Service Requests</h3>
              <p className="text-xs text-muted-foreground">Electrician, Plumber, AC & Handyman</p>
            </div>
            <Link
              to="/resident/tickets"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View All ({serviceRequests.length})
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {serviceRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active service requests.
              </div>
            ) : (
              serviceRequests.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  to={`/resident/tickets?id=${s.id}`}
                  className="block p-3.5 rounded-xl border border-border/60 hover:border-blue-300 hover:bg-slate-50/60 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 capitalize truncate">
                      #{s.id} · {s.service_type?.replace('_', ' ') || 'Service'}
                    </span>
                    <Badge variant={s.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">{s.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                    <span className="capitalize text-slate-500 font-medium">Status: {s.status}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
