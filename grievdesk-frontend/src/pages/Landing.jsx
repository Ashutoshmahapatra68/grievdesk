import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Shield,
  Home,
  MessageSquarePlus,
  CalendarDays,
  Wallet,
  BookOpen,
  ArrowRight,
  Phone,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SOCIETY_NAME } from '@/lib/constants'

const env = import.meta.env

export default function Landing() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo subtitle="Society Grievance Desk" />

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login?portal=management"
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Management</span>
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI-Powered Community Grievance Management</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
            Report a Problem. Track It. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Get It Fixed Faster.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Welcome to <strong>{SOCIETY_NAME}</strong>'s centralized resident portal. Log issues via text or voice in your preferred language. Gemini classifies, prioritizes, and links duplicates automatically.
          </p>

          {/* Dual Portal Selection Cards */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {/* Resident Card */}
            <div className="bg-white border-2 border-slate-200/80 hover:border-blue-500 rounded-3xl p-6 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Resident Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Submit complaints, request technicians, view maintenance dues, and book clubhouse facilities.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/login?portal=resident"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  <span>Resident Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Register Flat
                </Link>
              </div>
            </div>

            {/* Management Card */}
            <div className="bg-white border-2 border-slate-200/80 hover:border-purple-500 rounded-3xl p-6 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Management Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Dedicated operations dashboard for Society Secretary and Committee members to triage complaints.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/login?portal=management"
                  className="px-4 py-2 bg-purple-900 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition-all flex items-center gap-1.5"
                >
                  <span>Staff Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/register?role=admin"
                  className="text-xs font-semibold text-purple-600 hover:underline"
                >
                  Initial Setup
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Enterprise Community Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Designed for transparency, real-time collaboration, and swift resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Conversational AI</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log issues via natural language text or voice notes. Categorized and marked for urgency in seconds.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Amenity Scheduling</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Browse clubhouse, pool, and sports facilities with conflict detection and automated booking limits.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Digital Bylaws</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Official society bylaws indexed into AI so residents get immediate answers about community rules.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Maintenance Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transparent dues tracking, verified payment records, and timely reminder notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contacts Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h3 className="text-base font-bold text-slate-900 mb-4 text-center">Emergency Society Contacts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-center">
            <span className="text-xs text-red-700 font-semibold block">Security Desk</span>
            <span className="text-sm font-bold font-mono block mt-1">
              {env.VITE_SECURITY_PHONE || 'Gate 1'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-center">
            <span className="text-xs text-red-700 font-semibold block">Fire Emergency</span>
            <span className="text-sm font-bold font-mono block mt-1">101</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-center">
            <span className="text-xs text-red-700 font-semibold block">Ambulance</span>
            <span className="text-sm font-bold font-mono block mt-1">102</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-center">
            <span className="text-xs text-red-700 font-semibold block">Lift Emergency</span>
            <span className="text-sm font-bold font-mono block mt-1">
              {env.VITE_LIFT_PHONE || '24x7 Help'}
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>
          {SOCIETY_NAME} · {env.VITE_COMMITTEE_EMAIL || 'management@society.com'} · Office Hours: {env.VITE_OFFICE_HOURS || '9:00 AM - 6:00 PM'}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Powered by GrievDesk Enterprise AI Platform · Integrated with Flask & MongoDB
        </p>
      </footer>
    </div>
  )
}
