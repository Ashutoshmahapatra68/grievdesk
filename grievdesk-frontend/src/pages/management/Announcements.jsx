import React, { useState, useEffect } from 'react'
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { announcementApi } from '@/api/announcementApi'
import { chatApi } from '@/api/chatApi'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ManagementAnnouncements() {
  const toast = useToast()
  const [pinned, setPinned] = useState([])
  const [general, setGeneral] = useState([])
  const [loading, setLoading] = useState(true)

  // Create Announcement Modal State (Drafted by AI)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [announcementPrompt, setAnnouncementPrompt] = useState('')
  const [isPinChecked, setIsPinChecked] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit Announcement Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editMessage, setEditMessage] = useState('')
  const [editing, setEditing] = useState(false)

  // Delete State
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAnnouncements = () => {
    setLoading(true)
    announcementApi.listAnnouncements({ limit: 50 })
      .then((res) => {
        setPinned(res.pinned || [])
        setGeneral(res.general || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementPrompt.trim()) return

    setCreating(true)
    try {
      // Uses the backend chat committee action: Gemini drafts the formal title & message and broadcasts notification!
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'announcement',
        text: announcementPrompt.trim(),
        pin: isPinChecked,
      })

      toast.success(res.reply || 'Announcement published and broadcast to residents.')
      setCreateModalOpen(false)
      setAnnouncementPrompt('')
      setIsPinChecked(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.message || 'Failed to publish announcement.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditing(true)
    try {
      await announcementApi.editAnnouncement(editingAnnouncement.id, {
        title: editTitle.trim(),
        message: editMessage.trim(),
      })
      toast.success('Announcement updated.')
      setEditModalOpen(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.message || 'Failed to update announcement.')
    } finally {
      setEditing(false)
    }
  }

  const handleTogglePin = async (ann) => {
    try {
      await announcementApi.pinAnnouncement(ann.id, !ann.is_pinned)
      toast.success(!ann.is_pinned ? 'Notice pinned to top.' : 'Notice unpinned.')
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.message || 'Pin action failed.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      await announcementApi.deleteAnnouncement(deleteTargetId)
      toast.success('Announcement deleted.')
      setDeleteTargetId(null)
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.message || 'Failed to delete announcement.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements Manager</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Broadcast community circulars, maintenance outages, and emergency alerts.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors self-start"
        >
          <Sparkles className="w-4 h-4" />
          <span>Publish Notice via AI</span>
        </button>
      </div>

      {/* Pinned Section */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
            <Pin className="w-3.5 h-3.5 fill-current text-amber-600" />
            <span>Pinned Announcements ({pinned.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinned.map((ann) => (
              <div
                key={ann.id}
                className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-card space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{ann.title}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 shrink-0">
                      Pinned
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {ann.message}
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-200/50 flex items-center justify-between text-xs">
                  <span className="text-amber-900/60 font-medium">By {ann.posted_by || ann.posted_by_name || 'Management'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(ann)}
                      className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg"
                      title="Unpin"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingAnnouncement(ann)
                        setEditTitle(ann.title)
                        setEditMessage(ann.message)
                        setEditModalOpen(true)
                      }}
                      className="p-1.5 text-slate-600 hover:bg-white rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(ann.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Notices */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          General Announcements ({general.length})
        </h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-2">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : general.length === 0 && pinned.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-base">No announcements active</h4>
            <p className="text-xs text-slate-500 mt-1">Click "Publish Notice via AI" above to draft a notice.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {general.map((ann) => (
              <div
                key={ann.id}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-card space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-slate-900 text-base">{ann.title}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleTogglePin(ann)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg"
                      title="Pin to top"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingAnnouncement(ann)
                        setEditTitle(ann.title)
                        setEditMessage(ann.message)
                        setEditModalOpen(true)
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(ann.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {ann.message}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Author: {ann.posted_by || ann.posted_by_name || 'Management'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Announcement via AI Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Publish Community Notice via AI"
          description="Gemini will format your brief notes into a clear, professional announcement title & message, and broadcast notifications."
          icon={Sparkles}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notice Brief / Details
              </label>
              <textarea
                rows={4}
                required
                value={announcementPrompt}
                onChange={(e) => setAnnouncementPrompt(e.target.value)}
                placeholder="e.g. Water tank cleaning scheduled for Friday 9:30 AM to 2 PM. Water supply will be disconnected during this window. Please store water in advance."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isPinChecked}
                onChange={(e) => setIsPinChecked(e.target.checked)}
                className="rounded text-blue-600 border-slate-300"
              />
              <span>Pin this notice to the top of all resident dashboards</span>
            </label>

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
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{creating ? 'AI Drafting & Broadcasting…' : 'Generate & Broadcast'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Announcement Modal */}
      {editModalOpen && editingAnnouncement && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Announcement"
          maxWidth="max-w-lg"
          icon={Edit2}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notice Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notice Content
              </label>
              <textarea
                rows={5}
                required
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editing}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {editing ? 'Saving…' : 'Update Notice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description="Are you sure you want to permanently delete this announcement? It will be removed from all resident dashboards."
        confirmText="Delete Notice"
        danger
        loading={deleting}
      />
    </div>
  )
}
