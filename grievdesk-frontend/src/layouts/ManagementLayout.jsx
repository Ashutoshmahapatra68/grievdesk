import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, Outlet, Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  AlertTriangle,
  Wrench,
  Megaphone,
  Wallet,
  CalendarDays,
  Users,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Home,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { userApi } from '@/api/userApi'
import { notificationApi } from '@/api/notificationApi'
import { Logo } from '@/components/Logo'
import { SOCIETY_NAME, LANGUAGES } from '@/lib/constants'

export function ManagementLayout() {
  const { user, isStaff, isSecretary, logout } = useAuth()
  const { i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownContainerRef = useRef(null)

  const refreshCounts = useCallback(() => {
    if (!isStaff) return
    notificationApi.getMyNotifications({ limit: 5 })
      .then((res) => setUnreadCount(res.unread_count || 0))
      .catch(() => {})

    if (isSecretary) {
      userApi.getPending()
        .then((res) => {
          setPendingCount(res.users?.length || 0)
        })
        .catch(() => {})
    }
  }, [isStaff, isSecretary])

  useEffect(() => {
    refreshCounts()
    const handler = () => refreshCounts()
    window.addEventListener('grievdesk:refresh-counts', handler)
    return () => window.removeEventListener('grievdesk:refresh-counts', handler)
  }, [refreshCounts])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
        setLangDropdownOpen(false)
        setUserDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLangDropdownOpen(false)
        setUserDropdownOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Non-staff members are unauthorized for management layout
  if (!isStaff) {
    return <Navigate to="/resident" replace />
  }

  const navItems = [
    { to: '/management', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/management/complaints', icon: AlertTriangle, label: 'Complaints Center' },
    { to: '/management/services', icon: Wrench, label: 'Service Requests' },
    { to: '/management/announcements', icon: Megaphone, label: 'Announcements' },
    { to: '/management/dues', icon: Wallet, label: 'Maintenance Dues' },
    { to: '/management/amenities', icon: CalendarDays, label: 'Amenities & Facilities' },
    { to: '/management/residents', icon: Users, label: 'Resident Directory' },
    { to: '/management/rules', icon: BookOpen, label: 'Rules & Bylaws' },
    ...(isSecretary
      ? [
          {
            to: '/management/approvals',
            icon: UserCheck,
            label: 'Pending Approvals',
            badge: pendingCount > 0 ? String(pendingCount) : null,
            badgeColor: 'bg-amber-500 text-white',
          },
          { to: '/management/admin', icon: ShieldCheck, label: 'Secretary Admin' },
        ]
      : []),
  ]

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code)
    setLangDropdownOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Management Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Header Branding */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col gap-2">
          <Logo light />
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
            <span className="truncate max-w-[130px] font-semibold text-white">{SOCIETY_NAME}</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isSecretary
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                  : 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
              }`}
            >
              {isSecretary ? 'SECRETARY' : 'COMMITTEE'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Switch to Resident Portal */}
        <div className="p-3 border-t border-slate-800">
          <Link
            to="/resident"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Switch to Resident View</span>
          </Link>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 capitalize truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Management Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-subtle z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 hidden sm:inline-block">
                Management Portal
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isSecretary
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {isSecretary ? 'Secretary Dashboard' : 'Committee Dashboard'}
              </span>
            </div>
          </div>

          <div ref={dropdownContainerRef} className="flex items-center gap-2 sm:gap-3">
            {/* Global Search */}
            <Link
              to="/management/search"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Search all…</span>
            </Link>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen)
                  setUserDropdownOpen(false)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="uppercase">{i18n.language || 'en'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-elevation py-1 z-30">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between ${
                        i18n.language === lang.code ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{lang.label}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{lang.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <Link
              to="/management/notifications"
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen)
                  setLangDropdownOpen(false)
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
                <span className="text-xs font-semibold text-slate-800 hidden md:inline truncate max-w-[100px]">
                  {user?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-elevation py-2 z-30 divide-y divide-slate-100">
                  <div className="px-4 py-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.gmail}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {user?.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/resident"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Home className="w-4 h-4 text-slate-400" />
                      <span>Resident Portal</span>
                    </Link>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Management Main Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 shadow-elevation flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <Logo light />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            <div className="p-3 border-t border-slate-800">
              <Link
                to="/resident"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Switch to Resident View</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
