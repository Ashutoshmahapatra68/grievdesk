import React, { useState, useEffect } from 'react'
import { Bell, CheckCheck, Clock, Check, Megaphone, AlertCircle, Wrench, Wallet } from 'lucide-react'
import { notificationApi } from '@/api/notificationApi'
import { useToast } from '@/context/ToastContext'

export function ResidentNotifications() {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  const fetchNotifications = () => {
    setLoading(true)
    notificationApi.getMyNotifications({ limit: 50 })
      .then((res) => {
        setNotifications(res.notifications || [])
        setUnreadCount(res.unread_count || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      window.dispatchEvent(new Event('grievdesk:refresh-counts'))
    } catch {
      // Ignored
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      toast.success('All notifications marked as read.')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      window.dispatchEvent(new Event('grievdesk:refresh-counts'))
    } catch {
      toast.error('Failed to mark all as read.')
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    return true
  })

  const getIcon = (type) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-600" />
      case 'ticket_update':
        return <AlertCircle className="w-4 h-4 text-blue-600" />
      case 'dues_update':
        return <Wallet className="w-4 h-4 text-emerald-600" />
      default:
        return <Bell className="w-4 h-4 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Community announcements, ticket updates, and dues alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card divide-y divide-border/60 overflow-hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notifications to show</p>
            <p className="text-xs text-slate-400 mt-0.5">You are all caught up!</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                !item.is_read ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      !item.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {item.message}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>

              {!item.is_read && (
                <button
                  onClick={() => handleMarkRead(item.id)}
                  title="Mark as read"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
