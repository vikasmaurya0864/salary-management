# Salary Management Portal — Frontend

React + TypeScript (Vite) UI for the salary management backend.

## Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_KEY to the same value as backend API_KEY
npm install
npm run dev
```

App runs at `http://localhost:5173`. Backend should be on `http://localhost:4000` with CORS enabled.

## Auth flow

1. `X-API-Key` on every API call  
2. JWT `Authorization: Bearer <accessToken>` after login  
3. Backend permission grants for HR/Employee (Admin bypasses)

On `TOKEN_EXPIRED`, the client refreshes via `POST /api/auth/refresh`.

## Role dashboards

| Role | Routes |
|------|--------|
| **ADMIN** | `/admin/*` — users, roles, permissions, attendance, corrections, reports, profile |
| **HR** | `/hr/*` — employees, attendance, corrections, reports, profile |
| **EMPLOYEE** | `/employee/*` — mark attendance, attendance report (6 months), profile |

## Important

HR and Employee accounts need **ACTIVE** rows in `permissions` (created by Admin) for each API path/method they use, or calls return 403.
