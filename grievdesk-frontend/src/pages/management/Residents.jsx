import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Phone,
  Mail,
  Home,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertCircle,
  MoreVertical,
} from 'lucide-react'
import { userApi } from '@/api/userApi'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ManagementResidents() {
  const { user, isSecretary } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [blockFilter, setBlockFilter] = useState('all')

  // Action states
  const [promoteTarget, setPromoteTarget] = useState(null)
  const [demoteTarget, setDemoteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    userApi.getDirectory('approved')
      .then((res) => setUsers(res.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handlePromote = async () => {
    if (!promoteTarget) return
    setActionLoading(true)
    try {
      await userApi.promoteToCommittee(promoteTarget.id)
      toast.success(`${promoteTarget.name} is now a Committee Member.`)
      setPromoteTarget(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || 'Promotion failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDemote = async () => {
    if (!demoteTarget) return
    setActionLoading(true)
    try {
      await userApi.demoteUser(demoteTarget.id)
      toast.success(`${demoteTarget.name} demoted to Resident role.`)
      setDemoteTarget(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.message || 'Demotion failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const blocks = Array.from(new Set(users.map((u) => u.block_no).filter(Boolean))).sort()

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (blockFilter !== 'all' && u.block_no !== blockFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = (u.name || '').toLowerCase().includes(q)
      const matchEmail = (u.gmail || '').toLowerCase().includes(q)
      const matchPhone = (u.phone || '').toLowerCase().includes(q)
      const matchFlat = (u.flat_no || '').toLowerCase().includes(q)
      const matchBlock = (u.block_no || '').toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchPhone && !matchFlat && !matchBlock) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resident Directory & Staff</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete community roster. Committee members and Secretary can manage roles and contact info.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, flat, block, email, phone…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
          >
            <option value="all">All Roles</option>
            <option value="resident">Residents</option>
            <option value="committee">Committee</option>
            <option value="secretary">Secretary</option>
          </select>

          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
          >
            <option value="all">All Blocks</option>
            {blocks.map((b) => (
              <option key={b} value={b}>
                Block {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Member</th>
                <th className="px-4 py-3.5">Unit</th>
                <th className="px-4 py-3.5">Contact Email</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Role</th>
                {isSecretary && <th className="px-4 py-3.5 text-right">Role Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={isSecretary ? 6 : 5} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSecretary ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No community members match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {m.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      Block {m.block_no} · Flat {m.flat_no}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                      {m.gmail || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                      {m.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={m.role} size="sm" />
                    </td>
                    {isSecretary && (
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {m.role === 'resident' && (
                          <button
                            onClick={() => setPromoteTarget(m)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Promote to Committee
                          </button>
                        )}
                        {m.role === 'committee' && (
                          <button
                            onClick={() => setDemoteTarget(m)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Demote to Resident
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onConfirm={handlePromote}
        title="Promote Member to Committee"
        description={`Are you sure you want to promote ${promoteTarget?.name} to Committee Member? They will receive full access to the Management Portal.`}
        confirmText="Promote to Committee"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!demoteTarget}
        onClose={() => setDemoteTarget(null)}
        onConfirm={handleDemote}
        title="Demote Committee Member"
        description={`Are you sure you want to demote ${demoteTarget?.name} back to Resident role? Their management privileges will be revoked immediately.`}
        confirmText="Demote to Resident"
        danger
        loading={actionLoading}
      />
    </div>
  )
}
