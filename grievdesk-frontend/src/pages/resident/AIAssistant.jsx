import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Sparkles,
  Send,
  Mic,
  AlertTriangle,
  Wrench,
  BookOpen,
  Megaphone,
  History,
  Plus,
  Bot,
  User,
  Shield,
  Layers,
  ArrowRight,
  Loader2,
  Volume2,
  Globe,
} from 'lucide-react'
import { chatApi } from '@/api/chatApi'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/common/Badge'
import { VoiceRecorder } from '@/components/common/VoiceRecorder'

const CHAT_MODES = [
  { id: 'complaint', label: 'Raise Complaint', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'service', label: 'Handyman Service', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'rules', label: 'Ask Rules & Bylaws', icon: BookOpen, color: 'text-purple-600 bg-purple-50 border-purple-200' },
]

export function AIAssistant() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') || 'complaint'
  const { user, isStaff } = useAuth()

  const [selectedType, setSelectedType] = useState(initialType)
  const [anonymous, setAnonymous] = useState(false)
  const [committeeAction, setCommitteeAction] = useState('announcement')
  const [pinAnnouncement, setPinAnnouncement] = useState(false)

  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 10))
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Recent chat threads
  const [threads, setThreads] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Load recent threads
  const loadRecents = () => {
    chatApi.getRecents()
      .then((res) => setThreads(res.threads || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadRecents()
  }, [])

  const startNewChat = () => {
    setSessionId('sess_' + Math.random().toString(36).substring(2, 10))
    setMessages([])
    setInputText('')
  }

  const loadThread = async (sessId) => {
    setLoading(true)
    setSessionId(sessId)
    setShowHistory(false)
    try {
      const res = await chatApi.getRecentThread(sessId)
      const mapped = (res.messages || []).map((m) => ({
        role: m.role,
        text: m.content_text,
        type: m.selected_type,
        timestamp: m.created_at,
      }))
      setMessages(mapped)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (textToSend = inputText, audioBlob = null) => {
    if (!audioBlob && !textToSend.trim()) return

    const userMessage = {
      role: 'user',
      text: audioBlob ? '🎤 [Voice Note Recording]' : textToSend.trim(),
      type: selectedType,
      isAudio: !!audioBlob,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!audioBlob) setInputText('')
    setIsRecording(false)
    setLoading(true)

    try {
      const payload = {
        selected_type: selectedType,
        text: audioBlob ? undefined : textToSend.trim(),
        audio: audioBlob || undefined,
        session_id: sessionId,
        anonymous: selectedType === 'complaint' ? anonymous : undefined,
      }

      if (selectedType === 'committee_action') {
        payload.action = committeeAction
        if (committeeAction === 'announcement') {
          payload.pin = pinAnnouncement
        }
      }

      const res = await chatApi.sendMessage(payload)

      const assistantMessage = {
        role: 'assistant',
        text: res.reply,
        replyLocal: res.reply_local,
        complaint: res.complaint,
        serviceRequest: res.service_request,
        announcement: res.announcement,
        duplicateOf: res.duplicate_of,
        understood: res.understood,
        inputMode: res.input_mode,
        transcript: res.transcript,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      loadRecents()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.message || 'I encountered an error processing your request. Please try again.',
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col bg-card border border-border/80 rounded-3xl shadow-card overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-3.5 border-b border-border bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">GrievDesk AI Assistant</h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Powered by Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Type or speak in English, Hindi, or Odia to log tickets automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({threads.length})</span>
          </button>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat History Drawer */}
        {showHistory && (
          <div className="absolute inset-y-0 left-0 w-72 bg-white border-r border-border shadow-elevation z-20 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">Recent Conversations</span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No past chats recorded.</p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.session_id}
                    onClick={() => loadThread(t.session_id)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-colors flex flex-col gap-1 ${
                      sessionId === t.session_id
                        ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/60'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate font-medium">{t.title || 'Conversation'}</span>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="capitalize">{t.selected_type}</span>
                      <span>{t.message_count} msgs</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Center Chat Viewport */}
        <div className="flex-1 flex flex-col h-full bg-[#FAFBFD] overflow-hidden">
          {/* Mode Selector Tabs */}
          <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
            {CHAT_MODES.map((mode) => {
              const Icon = mode.icon
              const active = selectedType === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedType(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? `${mode.color} shadow-sm border`
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              )
            })}

            {isStaff && (
              <button
                onClick={() => setSelectedType('committee_action')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedType === 'committee_action'
                    ? 'text-amber-700 bg-amber-50 border border-amber-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Committee Action</span>
              </button>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">How can I help you today?</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Tell me what is wrong in plain English, Hindi, or Odia. I will summarize it, mark its urgency, and log it to the committee dashboard.
                  </p>
                </div>

                {/* Example prompts */}
                <div className="w-full space-y-2 pt-2 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Try saying:</p>
                  <button
                    onClick={() => {
                      setSelectedType('complaint')
                      setInputText('Water leakage in master bedroom bathroom from ceiling pipe.')
                    }}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left"
                  >
                    "Water leakage in master bedroom bathroom from ceiling pipe."
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType('service')
                      setInputText('Need an electrician to fix flickering lights in living room.')
                    }}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left"
                  >
                    "Need an electrician to fix flickering lights in living room."
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType('rules')
                      setInputText('Can I drill walls or do loud carpentry work on Sundays?')
                    }}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left"
                  >
                    "Can I drill walls or do loud carpentry work on Sundays?"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none'
                          : msg.isError
                          ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Multilingual Local Translation if available */}
                      {msg.replyLocal && msg.replyLocal !== msg.text && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50/60 p-2 rounded-xl">
                          <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                          <div>
                            <span className="font-semibold block text-[10px] uppercase tracking-wider text-blue-500">
                              Translated in your preferred language:
                            </span>
                            <span className="leading-relaxed">{msg.replyLocal}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rich Outcome: Complaint Created Card */}
                    {msg.complaint && (
                      <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm space-y-2 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Complaint Ticket #{msg.complaint.id} Generated
                          </span>
                          <Badge variant={msg.complaint.severity} size="sm" />
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {msg.complaint.translated_text}
                        </p>

                        {msg.duplicateOf && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/60 px-2.5 py-1 rounded-lg font-medium">
                            <Layers className="w-3.5 h-3.5" />
                            Linked to active problem #{msg.duplicateOf} for your block.
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Category: {msg.complaint.category}</span>
                          <Link
                            to={`/resident/complaints?id=${msg.complaint.id}`}
                            className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View Ticket <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Rich Outcome: Service Request Created Card */}
                    {msg.serviceRequest && (
                      <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-2xl shadow-sm space-y-2 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-indigo-900 capitalize">
                            Service #{msg.serviceRequest.id}: {msg.serviceRequest.service_type?.replace('_', ' ')}
                          </span>
                          <Badge variant={msg.serviceRequest.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-700">{msg.serviceRequest.description}</p>
                        <div className="pt-1 flex justify-end">
                          <Link
                            to={`/resident/tickets?id=${msg.serviceRequest.id}`}
                            className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
                          >
                            Track Request <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-xs font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs font-medium text-slate-500">Gemini is analyzing your request…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar Section */}
          <div className="p-4 bg-white border-t border-slate-200/80 space-y-2 shrink-0">
            {/* Mode-specific Option Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {selectedType === 'complaint' && (
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Submit as Anonymous complaint</span>
                </label>
              )}

              {selectedType === 'committee_action' && (
                <div className="flex items-center gap-3">
                  <select
                    value={committeeAction}
                    onChange={(e) => setCommitteeAction(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-lg"
                  >
                    <option value="announcement">Publish Announcement</option>
                    <option value="dues_reminder">Send Dues Reminder</option>
                  </select>
                  {committeeAction === 'announcement' && (
                    <label className="flex items-center gap-1 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={pinAnnouncement}
                        onChange={(e) => setPinAnnouncement(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Pin to Top</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Voice Recorder Overlay if opened */}
            {isRecording ? (
              <VoiceRecorder
                onRecordingComplete={(blob, file) => {
                  handleSendMessage('', file)
                }}
                onCancel={() => setIsRecording(false)}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Record voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      selectedType === 'complaint'
                        ? 'Describe the problem (e.g. lift in Block B making squeaking sound)…'
                        : selectedType === 'service'
                        ? 'Which service is needed (e.g. call plumber for leaky tap)…'
                        : selectedType === 'rules'
                        ? 'Ask a question about society rules and bylaws…'
                        : 'Draft announcement text for the society…'
                    }
                    className="w-full pl-4 pr-10 py-3 text-sm bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="p-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-2xl shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
