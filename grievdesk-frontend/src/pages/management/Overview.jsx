import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Wallet,
  UserCheck,
  CalendarDays,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { complaintApi } from '@/api/complaintApi'
import { serviceRequestApi } from '@/api/serviceRequestApi'
import { userApi } from '@/api/userApi'
import { duesApi } from '@/api/duesApi'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/common/Badge'

export function ManagementOverview() {
  const { user, isSecretary } = useAuth()
  const [loading, setLoading] = useState(true)

  const [complaints, setComplaints] = useState([])
  const [services, setServices] = useState([])
  const [residents, setResidents] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [dues, setDues] = useState([])
  const [totalUnpaidDues, setTotalUnpaidDues] = useState('0')

  useEffect(() => {
    let mounted = true
    Promise.all([
      complaintApi.listComplaints({ limit: 100 }).catch(() => ({ complaints: [] })),
      serviceRequestApi.listServiceRequests().catch(() => ({ service_requests: [] })),
      userApi.getDirectory('approved').catch(() => ({ users: [] })),
      isSecretary ? userApi.getPending().catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
      duesApi.listDues().catch(() => ({ dues: [], total_unpaid: '0' })),
    ]).then(([cRes, sRes, uRes, pRes, dRes]) => {
      if (!mounted) return
      setComplaints(cRes.complaints || [])
      setServices(sRes.service_requests || [])
      setResidents(uRes.users || [])
      setPendingApprovals(pRes.users || [])
      setDues(dRes.dues || [])
      setTotalUnpaidDues(dRes.total_unpaid || '0')
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [isSecretary])

  // Computed metrics
  const newComplaints = complaints.filter((c) => c.status === 'new').length
  const inProgressComplaints = complaints.filter((c) => c.status === 'in_progress').length
  const escalatedComplaints = complaints.filter((c) => c.status === 'escalated').length
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length

  // Category counts for chart
  const categoryCounts = complaints.reduce((acc, c) => {
    const cat = c.category || 'Other'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCategoryCount = Math.max(...topCategories.map((c) => c[1]), 1)

  return (
    <div className="space-y-6">
      {/* Executive Welcome Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-elevation flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isSecretary
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700/80'
                  : 'bg-blue-900/80 text-blue-200 border border-blue-700/80'
              }`}
            >
              {isSecretary ? 'Secretary Console' : 'Committee Console'}
            </span>
            <span className="text-xs text-slate-400">· Real-time Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Society Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Welcome back, <strong className="text-white">{user?.name}</strong>. Here is the operational overview for today.
          </p>
        </div>

        {isSecretary && pendingApprovals.length > 0 && (
          <Link
            to="/management/approvals"
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0 animate-pulse"
          >
            <UserCheck className="w-4 h-4" />
            <span>{pendingApprovals.length} Resident Registrations Pending</span>
          </Link>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Approved Residents"
          value={residents.length}
          subtitle="Across all blocks"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Open Complaints"
          value={newComplaints + inProgressComplaints + escalatedComplaints}
          subtitle={`${escalatedComplaints} auto-escalated`}
          icon={AlertTriangle}
          color={escalatedComplaints > 0 ? 'rose' : 'amber'}
        />
        <StatCard
          title="Resolved Complaints"
          value={resolvedComplaints}
          subtitle={`Out of ${complaints.length} total`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Outstanding Dues"
          value={`₹${totalUnpaidDues}`}
          subtitle={`${dues.filter((d) => d.paid_status === 'unpaid').length} unpaid records`}
          icon={Wallet}
          color="navy"
        />
      </div>

      {/* Analytics Charts & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints by Category Chart */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Complaints by Category</h3>
              <p className="text-xs text-muted-foreground">Highest frequency issues reported</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{complaints.length} Total</span>
          </div>

          {topCategories.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">No complaint data recorded.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {topCategories.map(([category, count]) => {
                const percentage = Math.round((count / maxCategoryCount) * 100)
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800 font-semibold">{category}</span>
                      <span className="text-slate-500">{count} issue{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="bg-blue-600 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Complaints Status Breakdown */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Status Breakdown</h3>
            <p className="text-xs text-muted-foreground">Lifecycle of current complaints</p>

            <div className="space-y-3 mt-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">New / Unaddressed</span>
                <span className="text-sm font-black text-blue-900">{newComplaints}</span>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">In Progress</span>
                <span className="text-sm font-black text-amber-900">{inProgressComplaints}</span>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800">Auto-Escalated (5+ days)</span>
                <span className="text-sm font-black text-rose-900">{escalatedComplaints}</span>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">Resolved</span>
                <span className="text-sm font-black text-emerald-900">{resolvedComplaints}</span>
              </div>
            </div>
          </div>

          <Link
            to="/management/complaints"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center shadow-sm transition-all"
          >
            Manage Complaints Center →
          </Link>
        </div>
      </div>

      {/* Recent Complaints Stream */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Incident Submissions</h3>
            <p className="text-xs text-muted-foreground">Live feed of resident submissions requiring attention</p>
          </div>
          <Link
            to="/management/complaints"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View All ({complaints.length})
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {complaints.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">
                    #{c.id} · {c.category || 'General'}
                  </span>
                  <Badge variant={c.status} size="sm" />
                  <Badge variant={c.severity} size="sm" />
                  {c.is_anonymous && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Anonymous
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-1">{c.translated_text}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Unit: Block {c.block_no || '—'}, Flat {c.flat_no || '—'}</span>
                  <span>Reported: {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                  {c.assigned_to && <span>Assigned to: {c.assigned_to}</span>}
                </div>
              </div>

              <Link
                to={`/management/complaints?id=${c.id}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold text-slate-700 rounded-xl transition-colors shrink-0 self-start sm:self-center"
              >
                Inspect & Resolve
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
