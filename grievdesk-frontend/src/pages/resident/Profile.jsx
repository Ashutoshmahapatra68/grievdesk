import React, { useState, useEffect } from 'react'
import {
  User,
  Phone,
  Mail,
  Home,
  Globe,
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { userApi } from '@/api/userApi'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { LANGUAGES } from '@/lib/constants'

export function ResidentProfile() {
  const { user, refreshUser, logout } = useAuth()
  const toast = useToast()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    preferred_language: 'en',
    share_phone: false,
    flat_no: '',
    block_no: '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [reapprovalModalOpen, setReapprovalModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        preferred_language: user.preferred_language || 'en',
        share_phone: !!user.share_phone,
        flat_no: user.flat_no || '',
        block_no: user.block_no || '',
      })
    }
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Check if flat or block changed
    const moving = formData.flat_no !== user.flat_no || formData.block_no !== user.block_no
    if (moving && user.role !== 'secretary') {
      setReapprovalModalOpen(true)
      return
    }

    saveProfileChanges(false)
  }

  const saveProfileChanges = async (confirmReapproval = false) => {
    setProfileSaving(true)
    setError(null)

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      preferred_language: formData.preferred_language,
      share_phone: formData.share_phone,
      flat_no: formData.flat_no.trim(),
      block_no: formData.block_no.trim(),
    }

    if (confirmReapproval) {
      payload.confirm_reapproval = true
    }

    try {
      const res = await userApi.updateMe(payload)
      if (res.logged_out) {
        toast.info('Your flat change requires Secretary approval. You have been logged out.')
        logout('pendingApproval')
      } else {
        toast.success('Profile details saved.')
        refreshUser()
      }
      setReapprovalModalOpen(false)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError(null)

    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_new_password) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      await userApi.updateMe({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      toast.success('Password changed successfully.')
      setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' })
    } catch (err) {
      setPasswordError(err.message || 'Password update failed. Verify your current password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your contact information, language preference, and security settings.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <Badge variant={user?.role} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user?.gmail}</p>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              Block {user?.block_no} · Flat {user?.flat_no}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant={user?.approval_status || 'approved'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Personal Details</h3>
            <p className="text-xs text-slate-500">Update your name, contact phone and unit information.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Block
                </label>
                <input
                  type="text"
                  required
                  value={formData.block_no}
                  onChange={(e) => setFormData({ ...formData, block_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Flat No
                </label>
                <input
                  type="text"
                  required
                  value={formData.flat_no}
                  onChange={(e) => setFormData({ ...formData, flat_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Interface Language
              </label>
              <select
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.share_phone}
                  onChange={(e) => setFormData({ ...formData, share_phone: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 border-slate-300"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  Display my phone number in the Resident Directory so neighbors can reach me.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {profileSaving ? 'Saving…' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Security & Password</h3>
            <p className="text-xs text-slate-500">Ensure your account uses a secure password (min 8 characters).</p>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current_password: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password (min 8 chars)
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordData.confirm_new_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirm_new_password: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 transition-all disabled:opacity-50"
            >
              {passwordSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Re-approval Confirmation Modal */}
      {reapprovalModalOpen && (
        <Modal
          isOpen={reapprovalModalOpen}
          onClose={() => setReapprovalModalOpen(false)}
          title="Flat or Block Change Requires Re-approval"
          description="Security & Verification Policy"
          icon={AlertTriangle}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Changing your registered Flat number or Block requires re-verification by the Society Secretary. Once submitted, you will be <strong>logged out</strong> until the Secretary approves the unit change.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p><strong>Proposed Flat:</strong> {formData.flat_no}</p>
              <p><strong>Proposed Block:</strong> {formData.block_no}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReapprovalModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveProfileChanges(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
              >
                Confirm & Re-verify
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
