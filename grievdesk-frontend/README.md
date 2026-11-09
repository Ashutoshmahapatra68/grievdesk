# GrievDesk – AI-Powered Community Grievance Management Platform

GrievDesk is a professional, production-grade web platform for residential housing societies and apartment communities. It seamlessly integrates a Python Flask + MongoDB backend with a React + Vite frontend and Google Gemini AI.

---

## Key Features

### 1. Dual Portal Architecture
- **Resident Portal**:
  - **Overview**: Personalized greetings, unit information, quick statistics, pinned society circulars.
  - **AI Grievance Assistant**: Conversational issue reporting powered by Gemini with automatic category classification, severity detection, and duplicate linkage. Supports voice notes via browser MediaRecorder.
  - **My Complaints**: Searchable and filterable ticket table with detailed drawer, timeline events, assignee info, and audio playback.
  - **My Tickets**: Technical service requests (Plumber, Electrician, AC Mechanic, Laundry, Vehicle Service) with status updates.
  - **Society Announcements**: Official circulars with pinned notices highlighting.
  - **Amenities & Bookings**: Facility reservations with slot conflict checking, duration caps, and resident cancellation.
  - **Maintenance Dues**: Monthly charges tracking, clear status indicators (Paid/Unpaid), and payment guidelines.
  - **Community Bylaws**: Natural language Q&A against the uploaded society rulebook.
  - **Resident Directory**: Verified neighbor roster with privacy-preserving phone numbers.
  - **Profile Management**: Unit details, language preferences, and flat-change re-approval workflow.
  - **Notifications**: System and broadcast alerts with unread counter and batch read action.
- **Management Portal (Committee & Secretary)**:
  - **Executive Overview**: Real-time KPI metrics, category frequency bar charts, and status distributions.
  - **Complaints Center**: Multi-criteria filters (category, severity, status, block), status updates with resolution notes, staff assignments, duplicate linking, and audio playback.
  - **Service Requests Manager**: Technician coordination with status transitions (`new`, `in_progress`, `resolved`).
  - **Announcements Manager**: AI-assisted circular drafting, pin/unpin toggles, title/body editing, and deletions.
  - **Maintenance Dues Manager**: Society-wide invoice generation, payment status toggles (`mark-paid`, `mark-unpaid`), and targeted AI dues reminders.
  - **Amenities Manager**: Add new facilities, view all community bookings, and cancel conflicting reservations.
  - **Resident & Staff Roster**: Directory management, Secretary-only committee promotions and demotions.
  - **Rules & Bylaws**: Upload rulebook documents (.txt or .pdf, max 5 MB / 150,000 chars) and test queries against Gemini.
  - **Secretary Console**: Exclusive queue for pending resident registrations with 1-click approvals, and secure role transfer.

---

## Technology Stack

- **Frontend**: React 18, Vite 5, React Router DOM 6, Tailwind CSS 3, Lucide React, i18next
- **Backend**: Python Flask, Flask-JWT-Extended, Flask-CORS, PyMongo, Google GenAI SDK (Gemini), PyPDF
- **Database**: MongoDB

---

## Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your Flask backend:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCIETY_NAME=Greenwood Palms Housing Society
```

### 2. Install Dependencies & Run
```bash
npm install
npm run dev
```

The Vite dev server will start at `http://localhost:5173`.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## Authentication & Role-Based Access Control

- Login utilizes `POST /api/auth/login` returning Bearer JWT tokens.
- Tokens are automatically attached to all API requests via the centralized `apiClient`.
- Role-based routing enforces authorization for:
  - `resident` → Redirected to `/resident`
  - `committee` → Redirected to `/management`
  - `secretary` → Redirected to `/management` with administrative tabs unlocked (Resident Approvals, Staff Promotions/Demotions, Secretary Transfer).

---

## API Mapping & Integration Reference

All frontend API calls are centralized under `src/api/` and strictly map to the Flask backend routes:

| Domain | Route | Method | Description | Role / Auth |
|---|---|---|---|---|
| **Auth** | `/api/auth/register` | `POST` | Register Resident or initial Secretary | Public |
| **Auth** | `/api/auth/login` | `POST` | Authenticate and obtain JWT access token | Public |
| **Users** | `/api/users/me` | `GET` | Get authenticated profile | Any authenticated |
| **Users** | `/api/users/me` | `PUT` | Update profile / flat / password | Any authenticated |
| **Users** | `/api/users/directory` | `GET` | Directory of approved residents | Any authenticated |
| **Users** | `/api/users/pending` | `GET` | Queue of pending registrations | Secretary only |
| **Users** | `/api/users/<id>/approve` | `PATCH` | Approve resident registration | Secretary only |
| **Users** | `/api/users/<id>/promote-to-committee` | `PATCH` | Promote resident to committee member | Staff |
| **Users** | `/api/users/<id>/demote` | `PATCH` | Demote committee member back to resident | Secretary only |
| **Users** | `/api/users/<id>/transfer-secretary` | `PATCH` | Relinquish Secretary role to another member | Secretary only |
| **Chat & AI** | `/api/chat/message` | `POST` | Submit complaint, service, rules Q&A, circular | Any authenticated |
| **Chat & AI** | `/api/chat/recents` | `GET` | List chat session histories | Any authenticated |
| **Chat & AI** | `/api/chat/recents/<session_id>` | `GET` | Fetch specific chat message thread | Any authenticated |
| **Complaints** | `/api/complaints` | `GET` | List complaints with category/severity/status filters | Any authenticated |
| **Complaints** | `/api/complaints/<id>` | `GET` | Complaint details with event timeline & duplicates | Any authenticated |
| **Complaints** | `/api/complaints/<id>/status` | `PATCH` | Update status (`new`, `in_progress`, `resolved`, `escalated`) | Staff |
| **Complaints** | `/api/complaints/<id>/assign` | `PATCH` | Assign complaint to staff member or unassign | Staff |
| **Complaints** | `/api/complaints/<id>/duplicate` | `PATCH` | Link/unlink complaint as duplicate | Staff |
| **Complaints** | `/api/complaints/<id>/audio` | `GET` | Stream recorded complaint voice note | Owner or Staff |
| **Service Req** | `/api/service-requests` | `GET` | List service requests | Resident (own) / Staff (all) |
| **Service Req** | `/api/service-requests/<id>` | `GET` | Request details and event timeline | Owner or Staff |
| **Service Req** | `/api/service-requests/<id>/status` | `PATCH` | Update status (`new`, `in_progress`, `resolved`) | Staff |
| **Tickets** | `/api/my-tickets` | `GET` | Resident complaints & service tickets with timelines | Resident |
| **Announcements**| `/api/announcements` | `GET` | List pinned and general announcements | Any authenticated |
| **Announcements**| `/api/announcements/<id>/pin` | `PATCH` | Pin or unpin announcement | Staff |
| **Announcements**| `/api/announcements/<id>` | `PATCH` | Edit title and/or message | Staff |
| **Announcements**| `/api/announcements/<id>` | `DELETE` | Delete circular | Staff |
| **Amenities** | `/api/amenities` | `GET` | List society facilities | Any authenticated |
| **Amenities** | `/api/amenities` | `POST` | Create society facility | Staff |
| **Amenities** | `/api/amenities/<id>/availability` | `GET` | Check booked slots for specific date | Any authenticated |
| **Bookings** | `/api/amenity-bookings` | `POST` | Book amenity slot | Any authenticated |
| **Bookings** | `/api/amenity-bookings/me` | `GET` | View resident bookings | Any authenticated |
| **Bookings** | `/api/amenity-bookings` | `GET` | Staff view of all society bookings | Staff |
| **Bookings** | `/api/amenity-bookings/<id>` | `DELETE` | Cancel amenity reservation | Owner or Staff |
| **Dues** | `/api/dues/me` | `GET` | Outstanding and payment status for resident | Resident |
| **Dues** | `/api/dues` | `GET` | Society-wide dues with month/status/flat filters | Staff |
| **Dues** | `/api/dues` | `POST` | Generate invoice for resident | Staff |
| **Dues** | `/api/dues/<id>/mark-paid` | `PATCH` | Confirm offline/online payment received | Staff |
| **Dues** | `/api/dues/<id>/mark-unpaid` | `PATCH` | Mark due back as unpaid | Staff |
| **Dues** | `/api/dues/<id>` | `DELETE` | Remove due record | Staff |
| **Bylaws** | `/api/rules/upload` | `POST` | Upload rulebook .txt/.pdf or content_text | Staff |
| **Bylaws** | `/api/rules/ask` | `POST` | Ask natural language question on bylaws | Any authenticated |
| **Search** | `/api/search` | `GET` | Unified multi-domain search | Any authenticated |
| **Notifications** | `/api/notifications/me` | `GET` | Get broadcast and personal notifications | Any authenticated |
| **Notifications** | `/api/notifications/<id>/read` | `PATCH` | Mark individual notification as read | Any authenticated |
| **Notifications** | `/api/notifications/read-all` | `POST` | Mark all notifications as read | Any authenticated |

---

## Architectural Boundaries & Backend Fidelity

1. **No Direct Complaint POST**: The Flask backend creates complaints exclusively via `POST /api/chat/message` with `selected_type: "complaint"`. The frontend AI Assistant and Complaint Submission components strictly route through this endpoint.
2. **First Secretary Auto-Bootstrap**: In accordance with the backend model, registration with `role: "admin"` is permitted only when no secretary currently exists in the society. Once registered, subsequent attempts return `409 secretary_already_exists`.
3. **Approval Gating**: Resident registrations default to `pending` status. Login attempts before approval return `403 pending_approval` and are handled gracefully by the auth context with an informative modal.
4. **Offline Dues Settlement**: The backend does not integrate third-party payment gateways (Stripe/Razorpay); instead, committee/secretary members record payments via `PATCH /api/dues/<id>/mark-paid` upon verification.

