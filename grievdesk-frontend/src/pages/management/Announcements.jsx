import React, { useState, useEffect } from 'react'
import {
  Megaphone,
  Pin,
  Trash2,
  Edit2,
  Sparkles,
  Clock,
  RefreshCw,
  Send,
  ArrowLeft,
  Flame,
  Users,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { announcementApi } from '@/api/announcementApi'
import { chatApi } from '@/api/chatApi'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const QUICK_TOPICS = [
  {
    label: '💧 Water Outage',
    prompt: 'Water tank deep cleaning scheduled for Friday 10:00 AM to 3:00 PM. Water supply will be paused across all wings. Please store water in advance.',
    tone: 'urgent',
  },
  {
    label: '⚡ Lift Inspection',
    prompt: 'Elevator safety overhaul in Block B on Saturday 2:00 PM to 5:00 PM. Please use Block A service lift or stairs.',
    tone: 'urgent',
  },
  {
    label: '🏛️ Society AGM',
    prompt: 'Annual General Body Meeting on Sunday 11:00 AM in the Clubhouse to review audited financials and approve society repairs.',
    tone: 'formal',
  },
  {
    label: '🎉 Cultural Dinner',
    prompt: 'Community cultural celebration & grand dinner this Saturday at 7:00 PM in the Central Lawn. All residents and families are welcome.',
    tone: 'friendly',
  },
  {
    label: '🛡️ Gate Security',
    prompt: 'Mandatory visitor and delivery vehicle registration at main security gate starting Monday. All residents must approve via intercom.',
    tone: 'formal',
  },
  {
    label: '🦟 Pest Control',
    prompt: 'Society-wide mosquito fogging and clubhouse pest control on Thursday morning 8:00 AM. Please keep balcony windows closed.',
    tone: 'formal',
  },
]

const TONE_OPTIONS = [
  {
    id: 'formal',
    name: 'Formal Circular',
    desc: 'Official, structured society circular with formal salutation & secretary sign-off',
    icon: FileText,
    badge: 'Official',
  },
  {
    id: 'urgent',
    name: 'Urgent Alert',
    desc: 'High-visibility advisory with bold warnings for outages, repairs & emergencies',
    icon: Flame,
    badge: 'High Priority',
  },
  {
    id: 'friendly',
    name: 'Community & Event',
    desc: 'Warm and inviting notice for celebrations, gatherings, and general updates',
    icon: Users,
    badge: 'Social',
  },
]

export function ManagementAnnouncements() {
  const toast = useToast()
  const [pinned, setPinned] = useState([])
  const [general, setGeneral] = useState([])
  const [loading, setLoading] = useState(true)

  // AI Notice Studio Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [aiStep, setAiStep] = useState('input') // 'input' | 'preview'
  const [announcementPrompt, setAnnouncementPrompt] = useState('')
  const [aiTone, setAiTone] = useState('formal') // 'formal' | 'urgent' | 'friendly'
  const [draftTitle, setDraftTitle] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const [isPinChecked, setIsPinChecked] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [refiningTone, setRefiningTone] = useState(null) // null | 'urgent' | 'formal' | 'friendly' | 'custom'
  const [customRefinePrompt, setCustomRefinePrompt] = useState('')

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

  // 1. Generate Notice Draft via AI
  const handleGenerateDraft = async (overridePrompt, overrideTone) => {
    const textToUse = (overridePrompt || announcementPrompt).trim()
    const toneToUse = overrideTone || aiTone
    if (!textToUse) {
      toast.error('Please enter a brief or choose a quick topic.')
      return
    }

    setDrafting(true)
    try {
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'announcement',
        text: textToUse,
        tone: toneToUse,
        preview: true,
      })

      if (res.draft && res.draft.title && res.draft.message) {
        setDraftTitle(res.draft.title)
        setDraftMessage(res.draft.message)
        setAiTone(toneToUse)
        setAiStep('preview')
        toast.success('Gemini AI drafted your notice! Review and fine-tune below.')
      } else {
        toast.error(res.reply || 'AI could not draft a notice. Please refine your brief.')
      }
    } catch (err) {
      toast.error(err.message || 'AI drafting failed.')
    } finally {
      setDrafting(false)
    }
  }

  // 2. Refine existing draft to a different tone
  const handleRefineTone = async (targetTone) => {
    if (!draftMessage.trim() && !draftTitle.trim() && !announcementPrompt.trim()) {
      toast.error('No content available to refine.')
      return
    }

    setRefiningTone(targetTone)
    try {
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'announcement',
        title: draftTitle.trim(),
        message: draftMessage.trim(),
        text: announcementPrompt.trim(),
        tone: targetTone,
        refine: true,
        preview: true,
      })

      if (res.draft && res.draft.title && res.draft.message) {
        setDraftTitle(res.draft.title)
        setDraftMessage(res.draft.message)
        setAiTone(targetTone)

        if (targetTone === 'urgent') {
          toast.success('Notice refined to Urgent High-Priority Alert! ⚠️')
        } else if (targetTone === 'friendly') {
          toast.success('Notice refined to Warm Community Invitation! 🎉')
        } else {
          toast.success('Notice refined to Official Formal Circular! 👔')
        }
      } else {
        toast.error(res.reply || 'AI could not refine this notice. Try tweaking the text.')
      }
    } catch (err) {
      toast.error(err.message || 'AI tone refinement failed.')
    } finally {
      setRefiningTone(null)
    }
  }

  // 3. Custom prompt refinement
  const handleCustomRefine = async (e) => {
    e?.preventDefault()
    if (!customRefinePrompt.trim()) return

    setRefiningTone('custom')
    try {
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'announcement',
        title: draftTitle.trim(),
        message: draftMessage.trim(),
        instruction: customRefinePrompt.trim(),
        text: customRefinePrompt.trim(),
        tone: aiTone,
        refine: true,
        preview: true,
      })

      if (res.draft && res.draft.title && res.draft.message) {
        setDraftTitle(res.draft.title)
        setDraftMessage(res.draft.message)
        setCustomRefinePrompt('')
        toast.success('Notice modified with your custom instructions! ✨')
      } else {
        toast.error(res.reply || 'AI could not apply your instructions.')
      }
    } catch (err) {
      toast.error(err.message || 'AI custom refinement failed.')
    } finally {
      setRefiningTone(null)
    }
  }

  // 2. Broadcast the Final Reviewed Notice
  const handleBroadcast = async (e) => {
    e?.preventDefault()
    if (!draftTitle.trim() || !draftMessage.trim()) {
      toast.error('Notice title and content cannot be empty.')
      return
    }

    setBroadcasting(true)
    try {
      const res = await chatApi.sendMessage({
        selected_type: 'committee_action',
        action: 'announcement',
        title: draftTitle.trim(),
        message: draftMessage.trim(),
        pin: isPinChecked,
      })

      toast.success(res.reply || 'Notice broadcast successfully to all residents!')
      setCreateModalOpen(false)
      setAiStep('input')
      setAnnouncementPrompt('')
      setDraftTitle('')
      setDraftMessage('')
      setIsPinChecked(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.message || 'Failed to broadcast announcement.')
    } finally {
      setBroadcasting(false)
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
          onClick={() => {
            setAiStep('input')
            setCreateModalOpen(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all self-start group"
        >
          <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
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

      {/* AI Notice Studio Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="AI Notice Studio"
          description="Powered by Gemini AI — transforms rough notes into professional community circulars."
          icon={Sparkles}
          maxWidth="max-w-2xl"
        >
          {aiStep === 'input' ? (
            <div className="space-y-4">
              {/* AI Banner */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <p className="font-bold text-blue-950">Intelligent Society Circular Generator</p>
                  <p className="text-slate-600 mt-0.5">
                    Type a few rough bullet points or pick a preset topic. Gemini will generate a polished title, formatted announcement, and prepare instant resident notifications.
                  </p>
                </div>
              </div>

              {/* Quick Topic Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Inspiration / Quick Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((topic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAnnouncementPrompt(topic.prompt)
                        setAiTone(topic.tone)
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 rounded-lg transition-colors border border-slate-200/60"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Topic Brief & Key Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={announcementPrompt}
                  onChange={(e) => setAnnouncementPrompt(e.target.value)}
                  placeholder="e.g. Lift in Block B undergoing annual maintenance on Saturday 2 PM to 5 PM. Use stairs or Block A service lift..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  AI Circular Tone & Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = aiTone === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAiTone(opt.id)}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                            {opt.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={drafting || !announcementPrompt.trim()}
                  onClick={() => handleGenerateDraft()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
                >
                  {drafting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini is Drafting Notice…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Generate AI Draft</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generated Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Draft Generated by Gemini AI</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Tone: {aiTone}
                </span>
              </div>

              {/* Editable Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notice Title (Editable)
                </label>
                <input
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Editable Body */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notice Content (Editable)
                </label>
                <textarea
                  rows={6}
                  required
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 leading-relaxed font-sans"
                />
              </div>

              {/* Pin Checkbox */}
              <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer text-xs font-semibold text-slate-800 hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={isPinChecked}
                  onChange={(e) => setIsPinChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-600 fill-current" />
                  <span>Pin this notice to the top of all resident dashboards</span>
                </div>
              </label>

              {/* Quick AI Refine Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quick AI Refine</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Click to transform tone instantly</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!!refiningTone}
                    onClick={() => handleRefineTone('urgent')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      aiTone === 'urgent'
                        ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-300/40'
                        : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300 shadow-xs'
                    } disabled:opacity-50`}
                  >
                    {refiningTone === 'urgent' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>{refiningTone === 'urgent' ? 'Refining to Urgent…' : 'Make More Urgent'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!!refiningTone}
                    onClick={() => handleRefineTone('formal')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      aiTone === 'formal'
                        ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-300/40'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 shadow-xs'
                    } disabled:opacity-50`}
                  >
                    {refiningTone === 'formal' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{refiningTone === 'formal' ? 'Refining to Formal…' : 'Make More Formal'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!!refiningTone}
                    onClick={() => handleRefineTone('friendly')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      aiTone === 'friendly'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-300/40'
                        : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300 shadow-xs'
                    } disabled:opacity-50`}
                  >
                    {refiningTone === 'friendly' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{refiningTone === 'friendly' ? 'Refining to Friendly…' : 'Make Friendlier'}</span>
                  </button>
                </div>

                {/* Custom AI Instruction Bar */}
                <form onSubmit={handleCustomRefine} className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customRefinePrompt}
                      onChange={(e) => setCustomRefinePrompt(e.target.value)}
                      placeholder="Or tell AI: e.g. 'Add ₹500 fine for violations' or 'Shorten to 2 bullet points'..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customRefinePrompt.trim() || !!refiningTone}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {refiningTone === 'custom' ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Applying…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Instruct AI</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAiStep('input')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Brief & Tone</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={broadcasting}
                    onClick={handleBroadcast}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
                  >
                    {broadcasting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Broadcasting to Residents…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Broadcast Notice to Residents</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
