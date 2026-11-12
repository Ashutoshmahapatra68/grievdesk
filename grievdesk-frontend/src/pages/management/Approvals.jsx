import React, { useState, useEffect } from 'react'
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Home,
  Phone,
  Mail,
  ShieldAlert,
  Inbox,
  AlertCircle,
} from 'lucide-react'
import { userApi } from '@/api/userApi'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'

export function ManagementApprovals() {
  const { isSecretary } = useAuth()
  const toast = useToast()
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)

  const fetchPending = () => {
    setLoading(true)
    userApi.getPending()
      .then((res) => setPendingUsers(res.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (user) => {
    setApprovingId(user.id)
    try {
      await userApi.approveUser(user.id)
      toast.success(`${user.name} (Flat ${user.flat_no}) approved. They can now log in.`)
      window.dispatchEvent(new Event('grievdesk:refresh-counts'))
      fetchPending()
    } catch (err) {
      toast.error(err.message || 'Failed to approve resident.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pending Resident Approvals</h1>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase">
            Secretary Only
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review new resident registration requests and verify flat ownership before granting access.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-2">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-3xl p-12 text-center shadow-card max-w-lg mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">All Registrations Approved</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            There are currently no residents waiting for Secretary verification. New resident signups will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingUsers.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                      {p.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Home className="w-3.5 h-3.5 text-slate-400" />
                        Block <strong className="text-slate-800">{p.block_no}</strong> · Flat{' '}
                        <strong className="text-slate-800">{p.flat_no}</strong>
                      </p>
                    </div>
                  </div>
                  <Badge variant="pending" size="sm" />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{p.gmail}</span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{p.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Registered member</span>
                <button
                  onClick={() => handleApprove(p)}
                  disabled={approvingId === p.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approvingId === p.id ? 'Approving…' : 'Approve Resident'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
