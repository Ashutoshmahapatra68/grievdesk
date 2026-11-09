import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Lock,
  Mail,
  Shield,
  Home,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SOCIETY_NAME } from '@/lib/constants'

export function Login() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { login, notice } = useAuth()

  const initialPortal = searchParams.get('portal') === 'management' ? 'management' : 'resident'
  const [portal, setPortal] = useState(initialPortal)

  const [gmail, setGmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingMessage, setPendingMessage] = useState(null)

  const handlePortalSwitch = (p) => {
    setPortal(p)
    setError(null)
    setPendingMessage(null)
    setSearchParams({ portal: p }, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setPendingMessage(null)

    if (!gmail.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const user = await login(gmail.trim(), password)

      // Role-based redirection
      if (user.role === 'resident') {
        if (portal === 'management') {
          // Resident tried logging in via Management Portal tab
          navigate('/resident', { replace: true })
        } else {
          navigate('/resident', { replace: true })
        }
      } else if (user.role === 'committee' || user.role === 'secretary') {
        navigate('/management', { replace: true })
      } else {
        navigate('/resident', { replace: true })
      }
    } catch (err) {
      if (err.code === 'pending_approval') {
        setPendingMessage(
          err.message || 'Your account is registered but awaiting Secretary approval before you can log in.'
        )
      } else if (err.code === 'invalid_credentials') {
        setError('Invalid email or password. Please verify and try again.')
      } else {
        setError(err.message || 'Unable to log in. Please check backend connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Griev<span className="text-blue-600">Desk</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">{SOCIETY_NAME}</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card border border-slate-200/80 rounded-3xl">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handlePortalSwitch('resident')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                portal === 'resident'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4 text-blue-600" />
              Resident Portal
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('management')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                portal === 'management'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-600" />
              Management Portal
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {portal === 'resident' ? 'Sign in to Resident Portal' : 'Sign in to Management Portal'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {portal === 'resident'
                ? 'Access complaints, tickets, dues, and AI assistant.'
                : 'For Society Secretary and Committee members.'}
            </p>
          </div>

          {/* Notice Banner */}
          {notice && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {notice === 'sessionExpired'
                  ? 'Your session has expired. Please sign in again.'
                  : notice}
              </span>
            </div>
          )}

          {/* Pending Approval Banner */}
          {pendingMessage && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Account Pending Approval
              </div>
              <p className="leading-relaxed text-amber-700">{pendingMessage}</p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value)}
                  placeholder="resident@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                'Authenticating…'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Portal Footer Links */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3 text-xs text-slate-600">
            {portal === 'resident' ? (
              <p>
                New resident in the society?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                  Register flat account
                </Link>
              </p>
            ) : (
              <p>
                First-time Secretary setup?{' '}
                <Link to="/register?role=admin" className="font-semibold text-purple-600 hover:underline">
                  Initial Secretary Setup
                </Link>
              </p>
            )}

            <Link to="/" className="text-slate-400 hover:text-slate-700">
              ← Back to Society Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
