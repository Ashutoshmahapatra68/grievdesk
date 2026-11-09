import React, { useState } from 'react'
import {
  BookOpen,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Sparkles,
} from 'lucide-react'
import { rulesApi } from '@/api/rulesApi'
import { useToast } from '@/context/ToastContext'

export function ManagementRules() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'test'

  // Upload State
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'text'
  const [selectedFile, setSelectedFile] = useState(null)
  const [ruleText, setRuleText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Test Q&A State
  const [testQuery, setTestQuery] = useState('')
  const [testResponse, setTestResponse] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    setUploadError(null)
    setUploadSuccess(null)
    setUploading(true)

    try {
      let res
      if (uploadMode === 'file') {
        if (!selectedFile) {
          throw new Error('Please choose a .txt or .pdf rulebook file.')
        }
        res = await rulesApi.uploadRulebook(selectedFile)
      } else {
        if (!ruleText.trim()) {
          throw new Error('Please paste rulebook content.')
        }
        res = await rulesApi.uploadRulebook(ruleText.trim())
      }

      setUploadSuccess(`Rulebook successfully uploaded! Stored as Version ${res.version} (${res.characters} characters extracted).`)
      toast.success('Bylaws document updated.')
      setSelectedFile(null)
      setRuleText('')
    } catch (err) {
      setUploadError(err.message || 'Rulebook upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleTestQuery = async (e) => {
    e.preventDefault()
    if (!testQuery.trim()) return
    setTesting(true)
    setTestResponse(null)
    try {
      const res = await rulesApi.askQuestion(testQuery.trim())
      setTestResponse(res)
    } catch (err) {
      toast.error(err.message || 'Test query failed.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Bylaws & Rules</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload society rulebooks (.txt or .pdf). The AI Assistant indexes these documents to answer resident inquiries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Upload Bylaws
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'test' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Test AI Answers
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg ${
                uploadMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Upload Document (.pdf/.txt)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg ${
                uploadMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Paste Text
            </button>
          </div>

          {uploadSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadMode === 'file' ? (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-sm font-bold text-blue-600 hover:underline">
                    Click to select file
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Accepts .txt or .pdf files up to 5 MB
                  </span>
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50/60 rounded-xl inline-flex items-center gap-2 text-xs font-semibold text-blue-900">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bylaws Text Content
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="Paste complete society rules, noise restrictions, facility policies, parking rules…"
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 font-mono text-xs"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || (uploadMode === 'file' ? !selectedFile : !ruleText.trim())}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              {uploading ? 'Processing & Indexing Document…' : 'Upload & Update Rulebook'}
            </button>
          </form>
        </div>
      ) : (
        /* Test Q&A Tab */
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Test Rulebook AI Responses</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Run test questions against the uploaded bylaws to verify how the assistant will answer residents.
            </p>
          </div>

          <form onSubmit={handleTestQuery} className="flex gap-2">
            <input
              type="text"
              required
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="e.g. Can residents park two cars in stilt parking?"
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={testing || !testQuery.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{testing ? 'Analyzing…' : 'Test Query'}</span>
            </button>
          </form>

          {testResponse && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase">AI Answer Status: {testResponse.status}</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                  Gemini Flash
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {testResponse.reply}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
