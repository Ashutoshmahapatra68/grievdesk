import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  MessageSquarePlus,
  AlertTriangle,
  Ticket,
  Megaphone,
  CalendarDays,
  Wallet,
  BookOpen,
  Users,
  Search,
  Bell,
  UserCircle,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Globe,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { notificationApi } from '@/api/notificationApi'
import { Logo } from '@/components/Logo'
import { SOCIETY_NAME, LANGUAGES } from '@/lib/constants'

const RESIDENT_NAV = [
  { to: '/resident', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/resident/ai-assistant', icon: MessageSquarePlus, label: 'AI Assistant', badge: 'Gemini' },
  { to: '/resident/complaints', icon: AlertTriangle, label: 'My Complaints' },
  { to: '/resident/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/resident/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/resident/amenities', icon: CalendarDays, label: 'Amenities & Bookings' },
  { to: '/resident/dues', icon: Wallet, label: 'Maintenance Dues' },
  { to: '/resident/rules', icon: BookOpen, label: 'Community Rules' },
  { to: '/resident/directory', icon: Users, label: 'Resident Directory' },
]

export function ResidentLayout() {
  const { user, isStaff, logout } = useAuth()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    notificationApi.getMyNotifications({ limit: 5 })
      .then((res) => {
        setUnreadCount(res.unread_count || 0)
      })
      .catch(() => {})
  }, [])

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code)
    setLangDropdownOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200/80 shadow-subtle shrink-0">
        {/* Brand & Portal Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
          <Logo />
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <span className="truncate max-w-[140px] font-semibold text-slate-700">{SOCIETY_NAME}</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              RESIDENT
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {RESIDENT_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Staff Portal Switcher if user is committee/secretary */}
        {isStaff && (
          <div className="p-3 border-t border-slate-100">
            <Link
              to="/management"
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-colors"
            >
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Switch to Management</span>
            </Link>
          </div>
        )}

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between p-2 rounded-xl">
            <Link to="/resident/profile" className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'R'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  Block {user?.block_no} · Flat {user?.flat_no}
                </p>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-subtle z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block">
              Resident Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <Link
              to="/resident/search"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Search records…</span>
            </Link>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
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

            {/* Notifications Bell */}
            <Link
              to="/resident/notifications"
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
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
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
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {user?.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/resident/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserCircle className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>

                    {isStaff && (
                      <Link
                        to="/management"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50/50 hover:bg-blue-100/70"
                      >
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Management Portal</span>
                      </Link>
                    )}
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

        {/* Page Content Viewport */}
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
          <aside className="fixed inset-y-0 left-0 w-72 bg-white shadow-elevation flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {RESIDENT_NAV.map((item) => {
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
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                )
              })}
            </nav>

            {isStaff && (
              <div className="p-3 border-t border-slate-100">
                <Link
                  to="/management"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl"
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Management Portal</span>
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
