import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { userApi } from '@/api/userApi'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ManagementAdmin() {
  const { user, isSecretary, refreshUser } = useAuth()
  const toast = useToast()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Promotion / Demotion States
  const [promoteTarget, setPromoteTarget] = useState(null)
  const [demoteTarget, setDemoteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Transfer Secretary State
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('')
  const [transferring, setTransferring] = useState(false)

  const fetchMembers = () => {
    setLoading(true)
    userApi.getDirectory('approved')
      .then((res) => setMembers(res.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const committeeMembers = members.filter((m) => m.role === 'committee')
  const residentMembers = members.filter((m) => m.role === 'resident')
  const potentialSuccessors = members.filter((m) => m.id !== user?.id)

  const handlePromote = async () => {
    if (!promoteTarget) return
    setActionLoading(true)
    try {
      await userApi.promoteToCommittee(promoteTarget.id)
      toast.success(`${promoteTarget.name} has been promoted to Committee Member.`)
      setPromoteTarget(null)
      fetchMembers()
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
      toast.success(`${demoteTarget.name} has been demoted to Resident.`)
      setDemoteTarget(null)
      fetchMembers()
    } catch (err) {
      toast.error(err.message || 'Demotion failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTransferSecretary = async (e) => {
    e.preventDefault()
    if (!selectedSuccessorId) return

    setTransferring(true)
    try {
      const res = await userApi.transferSecretary(Number(selectedSuccessorId))
      toast.success(res.message || 'Secretary title transferred.')
      setTransferModalOpen(false)
      await refreshUser()
      fetchMembers()
    } catch (err) {
      toast.error(err.message || 'Secretary transfer failed.')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Secretary Administration</h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase">
            Exclusive Administrative Access
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage society committee appointments, remove committee privileges, or transfer the Society Secretary title.
        </p>
      </div>

      {/* Current Secretary Status Card */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 shadow-card border border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700/60">
              Active Society Secretary
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{user?.name}</h3>
            <p className="text-xs text-slate-400">
              Block {user?.block_no} · Flat {user?.flat_no} · {user?.gmail}
            </p>
          </div>
        </div>

        <button
          onClick={() => setTransferModalOpen(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Lock className="w-4 h-4" />
          <span>Transfer Secretary Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Committee Members Column */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Committee Members</h3>
              <p className="text-xs text-muted-foreground">Authorized to manage tickets and announcements</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {committeeMembers.length}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {committeeMembers.length === 0 ? (
              <p className="py-8 text-xs text-center text-slate-400">No committee members appointed yet.</p>
            ) : (
              committeeMembers.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                    <p className="text-xs text-slate-500">
                      Block {m.block_no} · Flat {m.flat_no}
                    </p>
                  </div>
                  <button
                    onClick={() => setDemoteTarget(m)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                  >
                    Demote to Resident
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Residents Eligible for Promotion */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Approved Residents</h3>
              <p className="text-xs text-muted-foreground">Eligible to be appointed to the Society Committee</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {residentMembers.length}
            </span>
          </div>

          <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto pr-1">
            {residentMembers.length === 0 ? (
              <p className="py-8 text-xs text-center text-slate-400">No approved residents registered.</p>
            ) : (
              residentMembers.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                    <p className="text-xs text-slate-500">
                      Block {m.block_no} · Flat {m.flat_no}
                    </p>
                  </div>
                  <button
                    onClick={() => setPromoteTarget(m)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors"
                  >
                    Promote to Committee
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transfer Secretary Modal */}
      {transferModalOpen && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Transfer Society Secretary Role"
          description="High-security administrative handover action."
          icon={AlertTriangle}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleTransferSecretary} className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Important Notice
              </div>
              <p className="leading-relaxed">
                By transferring the Secretary title:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 pl-1">
                <li>You will immediately step down to a <strong>Committee Member</strong> role.</li>
                <li>The selected resident will become the sole <strong>Society Secretary</strong>.</li>
                <li>Both of you will receive automated notifications of this handover.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select New Secretary
              </label>
              <select
                required
                value={selectedSuccessorId}
                onChange={(e) => setSelectedSuccessorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-purple-600"
              >
                <option value="">-- Choose an approved member --</option>
                {potentialSuccessors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role}) · Block {s.block_no}, Flat {s.flat_no}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferring || !selectedSuccessorId}
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl shadow-sm"
              >
                {transferring ? 'Transferring Role…' : 'Confirm Role Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onConfirm={handlePromote}
        title="Promote Member to Committee"
        description={`Grant committee privileges to ${promoteTarget?.name}?`}
        confirmText="Promote"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!demoteTarget}
        onClose={() => setDemoteTarget(null)}
        onConfirm={handleDemote}
        title="Demote Committee Member"
        description={`Revoke committee privileges from ${demoteTarget?.name}?`}
        confirmText="Demote to Resident"
        danger
        loading={actionLoading}
      />
    </div>
  )
}
