import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Home,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SOCIETY_NAME, LANGUAGES } from '@/lib/constants'

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register } = useAuth()

  const isAdminParam = searchParams.get('role') === 'admin'
  const [isSecretaryReg, setIsSecretaryReg] = useState(isAdminParam)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    flat_no: '',
    block_no: '',
    gmail: '',
    preferred_language: 'en',
    password: '',
    confirmPassword: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successResult, setSuccessResult] = useState(null)

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        role: isSecretaryReg ? 'admin' : 'resident',
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        flat_no: formData.flat_no.trim(),
        block_no: formData.block_no.trim(),
        gmail: formData.gmail.trim(),
        preferred_language: formData.preferred_language,
        password: formData.password,
      }

      const res = await register(payload)
      setSuccessResult({
        message: res.message,
        isSecretary: isSecretaryReg,
        user: res.user,
      })
    } catch (err) {
      if (err.code === 'secretary_already_exists') {
        setError(
          'A Society Secretary is already registered for this society. Additional committee members must be approved and appointed by the existing Secretary.'
        )
      } else if (err.code === 'email_already_registered') {
        setError('This email is already registered. Please sign in instead.')
      } else if (err.code === 'weak_password') {
        setError('Password must be at least 8 characters long.')
      } else {
        setError(err.message || 'Registration failed. Please check your information.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (successResult) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-elevation text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {successResult.isSecretary ? 'Secretary Account Initialized' : 'Registration Submitted'}
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              {successResult.isSecretary
                ? 'Your Society Secretary account has been registered and approved automatically. You can now log in to the Management Portal.'
                : 'Your resident account has been created for Block ' +
                  successResult.user?.block_no +
                  ', Flat ' +
                  successResult.user?.flat_no +
                  '. It is currently awaiting Secretary approval before you can sign in.'}
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-left space-y-1">
              <p><strong>Resident Name:</strong> {successResult.user?.name}</p>
              <p><strong>Email:</strong> {successResult.user?.gmail}</p>
              <p><strong>Status:</strong> <span className="uppercase font-bold text-amber-600">{successResult.user?.approval_status}</span></p>
            </div>

            <div className="pt-2">
              <button
                onClick={() =>
                  navigate(successResult.isSecretary ? '/login?portal=management' : '/login')
                }
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                Proceed to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card border border-slate-200/80 rounded-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {isSecretaryReg ? 'Society Secretary Initial Setup' : 'Create Resident Account'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isSecretaryReg
                ? 'Authorized for the first society administrator only.'
                : 'Join your society community to raise complaints and track tickets.'}
            </p>
          </div>

          {/* Secretary Toggle Note */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSecretaryReg}
                onChange={(e) => {
                  setIsSecretaryReg(e.target.checked)
                  setError(null)
                }}
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Register as Society Secretary</span>
                <p className="text-slate-500 mt-0.5">
                  Check this only if you are setting up the society management portal as the primary administrator.
                </p>
              </div>
            </label>
          </div>

          {/* Committee Note */}
          <div className="mb-6 p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note on Committee accounts:</strong> Committee members cannot self-register directly. Register as a resident; the Secretary will approve and promote your account to the committee.
            </span>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Block / Wing
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.block_no}
                    onChange={(e) => handleChange('block_no', e.target.value)}
                    placeholder="e.g. A, B, Tower 1"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Flat / Unit Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.flat_no}
                  onChange={(e) => handleChange('flat_no', e.target.value)}
                  placeholder="e.g. 402, 12B"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.gmail}
                    onChange={(e) => handleChange('gmail', e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Language
                </label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => handleChange('preferred_language', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                'Submitting Registration…'
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-2 text-xs text-slate-600">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                Sign In
              </Link>
            </p>
            <Link to="/" className="text-slate-400 hover:text-slate-700 mt-1">
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
