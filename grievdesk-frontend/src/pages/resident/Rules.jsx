import React, { useState } from 'react'
import { BookOpen, Search, Send, Sparkles, HelpCircle, AlertCircle, Bot } from 'lucide-react'
import { rulesApi } from '@/api/rulesApi'
import { searchApi } from '@/api/searchApi'

const FAQ_PROMPTS = [
  'What are the quiet hours for noise and loud music?',
  'What is the policy for visitor parking inside the premises?',
  'Are pets allowed in the society and what are the leash rules?',
  'What permissions are needed before starting balcony or flat renovation?',
  'What are the timings for clubhouse and swimming pool access?',
]

export function ResidentRules() {
  const [question, setQuestion] = useState('')
  const [qaHistory, setQaHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [ruleSearchResults, setRuleSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const handleAsk = async (q = question) => {
    if (!q.trim()) return
    const text = q.trim()
    setQuestion('')
    setLoading(true)

    const entry = {
      question: text,
      answer: null,
      status: 'pending',
    }
    setQaHistory((prev) => [entry, ...prev])

    try {
      const res = await rulesApi.askQuestion(text)
      setQaHistory((prev) =>
        prev.map((item, idx) =>
          idx === 0 ? { ...item, answer: res.reply, status: res.status } : item
        )
      )
    } catch (err) {
      setQaHistory((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                answer: err.message || 'Unable to consult rulebook at this moment.',
                status: 'error',
              }
            : item
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSearchRulebook = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setSearchLoading(true)
    try {
      const res = await searchApi.search(question.trim(), 10)
      setRuleSearchResults(res.results?.rules || [])
    } catch {
      setRuleSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Rules & Bylaws</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Ask questions in natural language. Gemini consults the official society bylaws document to provide accurate answers.
        </p>
      </div>

      {/* Question Form */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAsk()
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about society policies, noise rules, parking, renovations…"
              className="w-full pl-4 pr-12 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Quick FAQ Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Frequently Asked:</span>
            <div className="flex flex-wrap gap-2">
              {FAQ_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(prompt)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-xs text-slate-700 border border-slate-200/60 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Q&A Feed */}
      <div className="space-y-4">
        {qaHistory.map((item, idx) => (
          <div
            key={idx}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-card space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug">{item.question}</p>
            </div>

            <div className="pl-8">
              {item.status === 'pending' ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>Consulting official society bylaws…</span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
