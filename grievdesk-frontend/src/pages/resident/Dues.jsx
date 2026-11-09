import React, { useState, useEffect } from 'react'
import { Wallet, CheckCircle2, AlertCircle, Clock, Info, Building } from 'lucide-react'
import { duesApi } from '@/api/duesApi'
import { Badge } from '@/components/common/Badge'
import { StatCard } from '@/components/common/StatCard'

export function ResidentDues() {
  const [dues, setDues] = useState([])
  const [totalUnpaid, setTotalUnpaid] = useState('0')
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    duesApi.getMyDues()
      .then((res) => {
        setDues(res.dues || [])
        setTotalUnpaid(res.total_unpaid || '0')
        setUnpaidCount(res.unpaid_count || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Dues</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your monthly maintenance charges, due dates, and verified payment history.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Outstanding Balance"
          value={`₹${totalUnpaid}`}
          subtitle={unpaidCount > 0 ? `${unpaidCount} unpaid billing cycle(s)` : 'Account is fully paid'}
          icon={Wallet}
          color={unpaidCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Paid Invoices"
          value={dues.filter((d) => d.paid_status === 'paid').length}
          subtitle="Verified by Society Committee"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Total Invoiced"
          value={dues.length}
          subtitle="Historical monthly cycles"
          icon={Clock}
          color="navy"
        />
      </div>

      {/* Payment Information Box */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold">Payment Methods & Verification Notice</p>
          <p className="leading-relaxed">
            Maintenance dues are collected via direct Society Bank Transfer (NEFT/IMPS/UPI) or at the Society Office desk. Once your transfer is verified, the management committee marks the bill as <strong>Paid</strong> in the system.
          </p>
        </div>
      </div>

      {/* Dues History Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Billing History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Month / Period</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Payment Status</th>
                <th className="px-4 py-3.5">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </td>
                  </tr>
                ))
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No maintenance dues on record for your flat.
                  </td>
                </tr>
              ) : (
                dues.map((due) => (
                  <tr key={due.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{due.month}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                      ₹{due.amount}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {due.due_date}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={due.paid_status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {due.paid_at ? new Date(due.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
