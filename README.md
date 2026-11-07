# GrievDesk — AI Grievance Redressal System

GrievDesk is an AI-powered community grievance redressal and community management platform for gated residential societies.

## Architecture

- **Backend** (`grievdesk-backend.-main`):
  - Python 3 + Flask REST API
  - PyMongo + MongoDB
  - Flask-JWT-Extended authentication
  - Google Gemini AI (complaint categorization, duplicate detection, bylaws Q&A)
- **Frontend** (`grievdesk-frontend`):
  - React 18 + Vite
  - Tailwind CSS + Radix UI
  - React Query + i18next multilingual support

## Deployment on Railway

- **Database**: Railway MongoDB template with persistent volume
- **Backend Service**: Root directory `/grievdesk-backend.-main`, command `gunicorn run:app`
- **Frontend Service**: Root directory `/grievdesk-frontend`, command `npm run preview`
