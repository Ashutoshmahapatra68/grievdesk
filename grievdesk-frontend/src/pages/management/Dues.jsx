import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Bell,
  Search,
  Filter,
  AlertCircle,
  Clock,
  Send,
} from 'lucide-react'
import { duesApi } from '@/api/duesApi'
import { userApi } from '@/api/userApi'
import { chatApi } from '@/api/chatApi'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ManagementDues() {
  const toast = useToast()
  const [dues, setDues] = useState([])
  const [totalUnpaid, setTotalUnpaid] = useState('0')
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [flatFilter, setFlatFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')

  // Create Due Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newMonth, setNewMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [newAmount, setNewAmount] = useState('2500')
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  })
  const [targetType, setTargetType] = useState('unit') // 'unit' | 'user'
  const [targetBlock, setTargetBlock] = useState('')
  const [targetFlat, setTargetFlat] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [creating, setCreating] = useState(false)

  // Dues Reminder Modal State
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderFlat, setReminderFlat] = useState('')
  const [reminderBlock, setReminderBlock] = useState('')
  const [reminderText, setReminderText] = useState('Kindly settle the pending society maintenance dues.')
  const [sendingReminder, setSendingReminder] = useState(false)

  // Delete State
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [approvedResidents, setApprovedResidents] = useState([])

  const fetchDues = () => {
    setLoading(true)
    const params = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (monthFilter) params.month = monthFilter
    if (flatFilter) params.flat_no = flatFilter
    if (blockFilter) params.block_no = blockFilter

    duesApi.listDues(params)
      .then((res) => {
        setDues(res.dues || [])
        setTotalUnpaid(res.total_unpaid || '0')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDues()
  }, [statusFilter, monthFilter, flatFilter, blockFilter])

  useEffect(() => {
    userApi.getDirectory('approved')
      .then((res) => setApprovedResidents(res.users || []))
      .catch(() => {})
  }, [])

  const handleCreateDue = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = {
        month: newMonth,
        amount: Number(newAmount),
        due_date: newDueDate,
      }
      if (targetType === 'user' && targetUserId) {
        payload.user_id = Number(targetUserId)
      } else {
        payload.flat_no = targetFlat.trim()
        payload.block_no = targetBlock.trim()
      }

      await duesApi.createDue(payload)
      toast.success('Maintenance charge generated.')
      setCreateModalOpen(false)
      fetchDues()
    } catch (err) {
      toast.error(err.message || 'Failed to create due.')
    } finally {
      setCreating(false)
    }
  }

  const handleMarkPaid = async (dueId) => {
    try {
      await duesApi.markPaid(dueId)
      toast.success('Payment verified & marked as Paid.')
      fetchDues()
    } catch (err) {
      toast.error(err.message || 'Update failed.')
    }
  }

  const handleMarkUnpaid = async (dueId) => {
    try {
      await duesApi.markUnpaid(dueId)
      toast.info('Marked as Unpaid.')
      fetchDues()
    } catch (err) {
      toast.error(err.message || 'Update failed.')
    }
  }

  const handleDeleteDue = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      await duesApi.deleteDue(deleteTargetId)
      toast.success('Due record deleted.')
      setDeleteTargetId(null)
      fetchDues()
    } catch (err) {
      toast.error(err.message || 'Failed to delete due.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSendReminder = async (e) => {
    e.preventDefault()
    setSendingReminder(true)
    try {
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'dues_reminder',
        flat_no: reminderFlat.trim(),
        block_no: reminderBlock.trim(),
        text: reminderText.trim(),
      })
      toast.success(res.reply || 'Dues reminder dispatched to resident.')
      setReminderModalOpen(false)
    } catch (err) {
      toast.error(err.message || 'Failed to send reminder.')
    } finally {
      setSendingReminder(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate monthly dues, verify received payments, and send targeted dues reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setReminderModalOpen(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span>Send Reminder</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Invoice Due</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase">Filters:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="paid">Paid Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Month (YYYY-MM)"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl w-36 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Block"
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl w-24"
          />
          <input
            type="text"
            placeholder="Flat #"
            value={flatFilter}
            onChange={(e) => setFlatFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl w-24"
          />
        </div>

        <div className="ml-auto text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
          Outstanding Society Unpaid: <span className="text-rose-600 font-mono">₹{totalUnpaid}</span>
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Bill #</th>
                <th className="px-4 py-3.5">Month</th>
                <th className="px-4 py-3.5">Resident / Unit</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No dues found matching filter criteria.
                  </td>
                </tr>
              ) : (
                dues.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      #{d.id}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                      {d.month}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      <span className="font-semibold block text-slate-900">
                        {d.resident_name || 'Resident'}
                      </span>
                      <span className="text-slate-500">
                        Block {d.block_no} · Flat {d.flat_no}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{d.amount}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {d.due_date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={d.paid_status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {d.paid_status === 'unpaid' ? (
                          <button
                            onClick={() => handleMarkPaid(d.id)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkUnpaid(d.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Mark Unpaid
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(d.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Due Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Maintenance Invoice"
          description="Generate a monthly maintenance due for a specific flat or resident."
          icon={Wallet}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateDue} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Month (YYYY-MM)
                </label>
                <input
                  type="text"
                  required
                  pattern="^\d{4}-(0[1-9]|1[0-2])$"
                  placeholder="2026-11"
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Block
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A"
                  value={targetBlock}
                  onChange={(e) => setTargetBlock(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Flat No
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 402"
                  value={targetFlat}
                  onChange={(e) => setTargetFlat(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {creating ? 'Invoicing…' : 'Generate Due'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Send Dues Reminder Modal */}
      {reminderModalOpen && (
        <Modal
          isOpen={reminderModalOpen}
          onClose={() => setReminderModalOpen(false)}
          title="Dispatch Dues Reminder to Resident"
          description="Sends a private dues alert notification to the approved resident living in this flat."
          icon={Bell}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSendReminder} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Block
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A"
                  value={reminderBlock}
                  onChange={(e) => setReminderBlock(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Flat No
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 301"
                  value={reminderFlat}
                  onChange={(e) => setReminderFlat(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Custom Reminder Message
              </label>
              <textarea
                rows={3}
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="Kindly clear pending maintenance dues…"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingReminder}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingReminder ? 'Sending…' : 'Send Reminder'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteDue}
        title="Delete Due Record"
        description="Are you sure you want to delete this maintenance due record? This action cannot be undone."
        confirmText="Delete Record"
        danger
        loading={deleting}
      />
    </div>
  )
}
