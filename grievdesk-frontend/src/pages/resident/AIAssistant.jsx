import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  AudioLines,
  AlertTriangle,
  Wrench,
  BookOpen,
  Megaphone,
  History,
  Plus,
  Bot,
  Layers,
  ArrowRight,
  Loader2,
  Globe,
  Pin,
  Bell,
  Wand2,
} from 'lucide-react'
import { chatApi } from '@/api/chatApi'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { VoiceRecorder } from '@/components/common/VoiceRecorder'

const CHAT_MODES = [
  { id: 'auto', label: 'Smart Auto', icon: Wand2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'complaint', label: 'Raise Complaint', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'service', label: 'Handyman Service', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'rules', label: 'Ask Rules & Bylaws', icon: BookOpen, color: 'text-purple-600 bg-purple-50 border-purple-200' },
]

const VALID_URL_MODES = new Set(['auto', 'complaint', 'service', 'rules', 'committee_action'])

function inferIntentFromText(text) {
  const lower = text.toLowerCase().trim()

  const serviceHints = [
    'need a plumber', 'call plumber', 'need an electrician', 'call electrician',
    'ac mechanic', 'ac service', 'ac repair', 'laundry', 'ironing', 'dry clean',
    'car wash', 'bike wash', 'vehicle service', 'puncture', 'book plumber',
    'book electrician', 'send an electrician', 'send a plumber',
  ]
  if (serviceHints.some((h) => lower.includes(h))) {
    return 'service'
  }

  const ruleHints = [
    'rule', 'rules', 'bylaw', 'bylaws', 'policy', 'allowed', 'permitted',
    'quiet hours', 'timings', 'timing', 'can i ', 'is it allowed', 'are pets',
    'what are the ', 'what is the ', 'when does ', 'how many ',
  ]
  if (lower.endsWith('?') || ruleHints.some((h) => lower.includes(h))) {
    return 'rules'
  }

  return 'complaint'
}

export function AIAssistant() {
  const [searchParams] = useSearchParams()
  const rawType = searchParams.get('type')
  const initialType = VALID_URL_MODES.has(rawType) ? rawType : 'auto'
  const { user, isStaff } = useAuth()
  const toast = useToast()

  const [selectedType, setSelectedType] = useState(initialType)
  const [anonymous, setAnonymous] = useState(false)
  const [committeeAction, setCommitteeAction] = useState('announcement')
  const [pinAnnouncement, setPinAnnouncement] = useState(false)
  const [reminderBlock, setReminderBlock] = useState('')
  const [reminderFlat, setReminderFlat] = useState('')

  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 10))
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isDictating, setIsDictating] = useState(false)

  // Recent chat threads
  const [threads, setThreads] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (VALID_URL_MODES.has(rawType)) {
      setSelectedType(rawType)
    }
  }, [rawType])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore cleanup stop errors
        }
      }
    }
  }, [])

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
      toast.error('Failed to load conversation history.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDictation = () => {
    if (!speechSupported) {
      toast.error('Live voice dictation is not supported in this browser. Use Voice Note recording instead.')
      return
    }

    if (isDictating && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsDictating(false)
      return
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRec()
    const langMap = { hi: 'hi-IN', or: 'or-IN', en: 'en-IN' }
    recognition.lang = langMap[user?.preferred_language] || 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    const baseText = inputText ? `${inputText.trim()} ` : ''

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInputText(baseText + transcript)
    }

    recognition.onerror = () => {
      setIsDictating(false)
      toast.error('Could not capture voice dictation. Check microphone permissions.')
    }

    recognition.onend = () => {
      setIsDictating(false)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsDictating(true)
    } catch {
      setIsDictating(false)
    }
  }

  const handleSendMessage = async (textToSend = inputText, audioBlob = null, forcedType = null) => {
    if (!audioBlob && !textToSend.trim()) return

    if (isDictating && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
      setIsDictating(false)
    }

    const rawTrimmed = textToSend.trim()
    const effectiveType =
      forcedType ||
      (selectedType === 'auto'
        ? audioBlob
          ? 'complaint'
          : inferIntentFromText(rawTrimmed)
        : selectedType)

    if (effectiveType === 'committee_action' && committeeAction === 'dues_reminder') {
      if (!reminderBlock.trim() || !reminderFlat.trim()) {
        toast.error('Please enter both Block and Flat number for the dues reminder.')
        return
      }
    }

    const userMessage = {
      role: 'user',
      text: audioBlob ? '🎤 [Voice Note Recording]' : rawTrimmed,
      type: effectiveType,
      isAudio: !!audioBlob,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!audioBlob && !forcedType) setInputText('')
    setIsRecording(false)
    setLoading(true)

    try {
      const payload = {
        selected_type: effectiveType,
        text: audioBlob ? undefined : rawTrimmed,
        audio: audioBlob || undefined,
        session_id: sessionId,
        anonymous: effectiveType === 'complaint' ? anonymous : undefined,
      }

      if (effectiveType === 'committee_action') {
        payload.action = committeeAction
        if (committeeAction === 'announcement') {
          payload.pin = pinAnnouncement
        } else if (committeeAction === 'dues_reminder') {
          payload.block_no = reminderBlock.trim()
          payload.flat_no = reminderFlat.trim()
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
        reminders: res.reminders,
        duplicateOf: res.duplicate_of,
        understood: res.understood,
        inputMode: res.input_mode,
        transcript: res.transcript,
        sentType: effectiveType,
        originalPrompt: rawTrimmed,
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
                Smart AI Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Type, dictate live, or record a voice note in English, Hindi, or Odia.
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
                    Tell me what is wrong, request a handyman, or ask about society bylaws in plain English, Hindi, or Odia.
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
                      {msg.transcript && (
                        <p className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg mb-2">
                          Transcript: "{msg.transcript}"
                        </p>
                      )}

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

                      {/* Quick Mode Retry Chips when intent wasn't understood */}
                      {msg.understood === false && msg.originalPrompt && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 mr-1">Try instead:</span>
                          {msg.sentType !== 'complaint' && (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(msg.originalPrompt, null, 'complaint')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                            >
                              Log as Complaint
                            </button>
                          )}
                          {msg.sentType !== 'service' && (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(msg.originalPrompt, null, 'service')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors"
                            >
                              Request Handyman
                            </button>
                          )}
                          {msg.sentType !== 'rules' && (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(msg.originalPrompt, null, 'rules')}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-semibold hover:bg-purple-100 transition-colors"
                            >
                              Ask Rulebook
                            </button>
                          )}
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

                    {/* Rich Outcome: Announcement Created Card */}
                    {msg.announcement && (
                      <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl shadow-sm space-y-2 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                            Notice Published
                          </span>
                          {msg.announcement.is_pinned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 flex items-center gap-1">
                              <Pin className="w-3 h-3" /> Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900">{msg.announcement.title}</p>
                        <p className="text-xs text-slate-700 line-clamp-2">{msg.announcement.message}</p>
                        <div className="pt-1 flex justify-end">
                          <Link
                            to="/management/announcements"
                            className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                          >
                            Manage Announcements <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Rich Outcome: Dues Reminders Dispatched */}
                    {msg.reminders && msg.reminders.length > 0 && (
                      <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm space-y-2">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-emerald-600" />
                          Dues Reminder Sent ({msg.reminders.length})
                        </span>
                        {msg.reminders.map((r, rIdx) => (
                          <div key={rIdx} className="text-xs text-slate-700 bg-white/80 p-2 rounded-lg border border-emerald-200/60">
                            <strong className="text-slate-900">{r.name}:</strong> {r.reminder}
                          </div>
                        ))}
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
                  <span className="text-xs font-medium text-slate-500">AI Assistant is analyzing your request…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar Section */}
          <div className="p-4 bg-white border-t border-slate-200/80 space-y-2.5 shrink-0">
            {/* Mode-specific Option Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {(selectedType === 'complaint' || selectedType === 'auto') && (
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Submit complaint anonymously (hides unit from neighbors)</span>
                </label>
              )}

              {selectedType === 'committee_action' && (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={committeeAction}
                    onChange={(e) => setCommitteeAction(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="announcement">Publish Announcement</option>
                    <option value="dues_reminder">Send Dues Reminder</option>
                  </select>

                  {committeeAction === 'announcement' ? (
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
                      <input
                        type="checkbox"
                        checked={pinAnnouncement}
                        onChange={(e) => setPinAnnouncement(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Pin to Top</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={reminderBlock}
                        onChange={(e) => setReminderBlock(e.target.value)}
                        placeholder="Block (e.g. A)"
                        className="w-24 px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={reminderFlat}
                        onChange={(e) => setReminderFlat(e.target.value)}
                        placeholder="Flat (e.g. 204)"
                        className="w-24 px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
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
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isDictating
                        ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                        : 'border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={isDictating ? 'Stop live voice dictation' : 'Live voice-to-text dictation'}
                  >
                    {isDictating ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Record audio voice note attachment"
                >
                  <AudioLines className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isDictating
                        ? 'Listening… speak now'
                        : selectedType === 'auto'
                        ? 'Describe a complaint, request a service, or ask about society rules…'
                        : selectedType === 'complaint'
                        ? 'Describe the problem (e.g. lift in Block B making squeaking sound)…'
                        : selectedType === 'service'
                        ? 'Which service is needed (e.g. call plumber for leaky tap)…'
                        : selectedType === 'rules'
                        ? 'Ask a question about society rules and bylaws…'
                        : committeeAction === 'dues_reminder'
                        ? 'Add an optional note for the resident dues reminder…'
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
