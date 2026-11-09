import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute'

// Layouts
import { ResidentLayout } from '@/layouts/ResidentLayout'
import { ManagementLayout } from '@/layouts/ManagementLayout'

// Public Pages
import Landing from '@/pages/Landing'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'

// Resident Pages
import { ResidentOverview } from '@/pages/resident/Overview'
import { AIAssistant } from '@/pages/resident/AIAssistant'
import { ResidentComplaints } from '@/pages/resident/Complaints'
import { ResidentTickets } from '@/pages/resident/Tickets'
import { ResidentAnnouncements } from '@/pages/resident/Announcements'
import { ResidentAmenities } from '@/pages/resident/Amenities'
import { ResidentDues } from '@/pages/resident/Dues'
import { ResidentRules } from '@/pages/resident/Rules'
import { ResidentDirectory } from '@/pages/resident/Directory'
import { ResidentProfile } from '@/pages/resident/Profile'
import { ResidentNotifications } from '@/pages/resident/Notifications'
import { ResidentSearch } from '@/pages/resident/Search'

// Management Pages
import { ManagementOverview } from '@/pages/management/Overview'
import { ManagementComplaints } from '@/pages/management/Complaints'
import { ManagementServices } from '@/pages/management/Services'
import { ManagementAnnouncements } from '@/pages/management/Announcements'
import { ManagementDues } from '@/pages/management/Dues'
import { ManagementAmenities } from '@/pages/management/Amenities'
import { ManagementResidents } from '@/pages/management/Residents'
import { ManagementRules } from '@/pages/management/Rules'
import { ManagementApprovals } from '@/pages/management/Approvals'
import { ManagementAdmin } from '@/pages/management/Admin'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <Landing />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/management/login"
        element={<Navigate to="/login?portal=management" replace />}
      />

      {/* Resident Portal Routes */}
      <Route
        element={
          <ProtectedRoute>
            <ResidentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/resident" element={<ResidentOverview />} />
        <Route path="/resident/ai-assistant" element={<AIAssistant />} />
        <Route path="/resident/complaints" element={<ResidentComplaints />} />
        <Route path="/resident/tickets" element={<ResidentTickets />} />
        <Route path="/resident/announcements" element={<ResidentAnnouncements />} />
        <Route path="/resident/amenities" element={<ResidentAmenities />} />
        <Route path="/resident/dues" element={<ResidentDues />} />
        <Route path="/resident/rules" element={<ResidentRules />} />
        <Route path="/resident/directory" element={<ResidentDirectory />} />
        <Route path="/resident/profile" element={<ResidentProfile />} />
        <Route path="/resident/notifications" element={<ResidentNotifications />} />
        <Route path="/resident/search" element={<ResidentSearch />} />

        {/* Backwards compatibility aliases from starter nav */}
        <Route path="/chat" element={<Navigate to="/resident/ai-assistant" replace />} />
        <Route path="/inbox" element={<Navigate to="/resident/complaints" replace />} />
        <Route path="/my-tickets" element={<Navigate to="/resident/tickets" replace />} />
        <Route path="/announcements" element={<Navigate to="/resident/announcements" replace />} />
        <Route path="/dues" element={<Navigate to="/resident/dues" replace />} />
        <Route path="/amenities" element={<Navigate to="/resident/amenities" replace />} />
        <Route path="/directory" element={<Navigate to="/resident/directory" replace />} />
        <Route path="/profile" element={<Navigate to="/resident/profile" replace />} />
        <Route path="/notifications" element={<Navigate to="/resident/notifications" replace />} />
        <Route path="/search" element={<Navigate to="/resident/search" replace />} />
      </Route>

      {/* Management Portal Routes (Committee and Secretary) */}
      <Route
        element={
          <ProtectedRoute roles={['committee', 'secretary']}>
            <ManagementLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/management" element={<ManagementOverview />} />
        <Route path="/management/complaints" element={<ManagementComplaints />} />
        <Route path="/management/services" element={<ManagementServices />} />
        <Route path="/management/announcements" element={<ManagementAnnouncements />} />
        <Route path="/management/dues" element={<ManagementDues />} />
        <Route path="/management/amenities" element={<ManagementAmenities />} />
        <Route path="/management/residents" element={<ManagementResidents />} />
        <Route path="/management/rules" element={<ManagementRules />} />

        {/* Secretary-Exclusive Management Routes */}
        <Route
          path="/management/approvals"
          element={
            <ProtectedRoute roles={['secretary']}>
              <ManagementApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/management/admin"
          element={
            <ProtectedRoute roles={['secretary']}>
              <ManagementAdmin />
            </ProtectedRoute>
          }
        />

        {/* Legacy aliases */}
        <Route path="/committee" element={<Navigate to="/management" replace />} />
        <Route path="/secretary" element={<Navigate to="/management/approvals" replace />} />
      </Route>

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
