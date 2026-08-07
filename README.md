# ACME Pay — Salary Management

A secure, role-based salary management portal for HR managers to manage employee compensation, attendance, and payroll analytics across countries — without spreadsheets.

Stack: **Fastify + TypeScript + PostgreSQL + Redis** (API) and **React + Vite** (UI).

---

## Required dependencies

### Runtime / tools

| Dependency | Version / notes |
|------------|-----------------|
| **Node.js** | 20+ recommended (LTS) |
| **npm** | Comes with Node |
| **PostgreSQL** | 14+ running locally (or reachable host) |
| **Redis** | 6+ running locally (optional for uptime — API falls back to Postgres if Redis is down) |

### Optional

| Dependency | Purpose |
|------------|---------|
| **SMTP** (host + credentials) | Password-reset OTP email, attendance reminder/absence emails. Without SMTP, emails are skipped; in development, password-reset OTPs are logged in the backend console. |

---

## Project layout

```
salary-management/
├── backend/     # API (port 4000)
└── frontend/    # React UI (Vite, port 5173)
```

---

## 1. Database & Redis

1. Create a Postgres database (name must match `DB_NAME` in `.env`, default `salary_management`).
2. Start Redis on `localhost:6379` (or set `REDIS_*` in backend `.env`).

---

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set at least:

- `API_KEY` — shared secret for `X-API-Key`
- `JWT_SECRET` — 16+ characters
- `DB_*` — Postgres connection
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin (used by seed)

Then:

```bash
npm install
npm run db:migrate
npm run db:seed
```

Optional scale demo (idempotent ~10k employees + salaries):

```bash
npm run db:seed:10k
```

Start the API (dev, hot reload):

```bash
npm run dev
```

API: [http://localhost:4000](http://localhost:4000)  
Health: [http://localhost:4000/health](http://localhost:4000/health)

Other useful scripts:

```bash
npm test              # unit tests (no DB)
npm run build && npm start   # production-style run
```

---

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env
```

Set:

- `VITE_API_BASE_URL=http://localhost:4000`
- `VITE_API_KEY=` **same value as backend `API_KEY`**

Then:

```bash
npm install
npm run dev
```

UI: [http://localhost:5173](http://localhost:5173)

---

## Quick start (both apps)

Open two terminals:

```bash
# Terminal 1 — API
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

Sign in at [http://localhost:5173/login](http://localhost:5173/login).

---

## Sample logins

| Role | Email | Password |
|------|--------|----------|
| **Admin** | Value of `ADMIN_EMAIL` in `backend/.env` | Value of `ADMIN_PASSWORD` in `backend/.env` |
| **Employee** (after `db:seed:10k`) | `employee2@acme.example` | `Employee@1234` |

---

## Features (high level)

- Auth: login, register, JWT + refresh, forgot password (OTP, 10 min), logout
- Roles: Admin, HR, Employee + path/method permissions
- Users, attendance (mark / corrections / reports / crons)
- Salaries, payslips, payroll analytics + CSV
- Redis GET cache with write invalidation

See `requirement.txt` for the full feature checklist.
