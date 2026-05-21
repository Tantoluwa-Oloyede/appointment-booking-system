# Appointment & Booking System — Backend API

A REST API for businesses where customers book time with a provider. The system handles authentication, role-based access, weekly availability, computed time slots, and bookings—with **PostgreSQL enforcing that the same provider (or customer) cannot hold two overlapping active appointments**.

Built with **Node.js (ESM)**, **Express 5**, and **PostgreSQL** via **pg-promise**.


## What this project does

| Role | Capabilities |
|------|----------------|
| **Customer** | Register, verify email (OTP), login, reset password, view available slots, create and manage their bookings |
| **Provider** | Register, complete business profile, manage services, set weekly availability, confirm/complete/cancel bookings for their business |
| **Admin** | Platform stats, list users/providers/bookings, suspend/activate users, promote/demote admins (with audit logging) |

### Why it is more than basic CRUD

- **Double-booking prevention** — Active bookings (`pending`, `confirmed`) use PostgreSQL `EXCLUDE` constraints on `tstzrange` so two concurrent requests cannot claim the same slot for the same provider (or overlapping slots for the same user).
- **Computed availability** — Slots are derived from weekly rules, service duration, breaks, existing bookings, and provider blocks—not a hardcoded list.
- **Booking lifecycle** — Status transitions (`pending` → `confirmed` / `cancelled` → `completed`) are constrained in the database.
- **Audit trail** — Booking status changes and admin actions are recorded in dedicated tables.

---

## Tech stack (actual dependencies)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES modules) |
| HTTP | Express.js 5 |
| Database | PostgreSQL |
| DB access | pg-promise |
| Migrations | db-migrate (run via CLI — see [Database setup](#database-setup)) |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Email | Nodemailer (Gmail SMTP) |
| Validation (library present) | Joi — schema defined in `src/lib/schemas/schema.auth.js` (not yet wired to routes; see [Validation](#validation)) |

**Not included in this repo (yet):** automated tests, Helmet, CORS middleware, rate limiting, OpenAPI/Postman collection, Docker, provider-block management API, idempotency API.

---

## Architecture

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────────────────────────┐
│   Client    │ ──────────────────► │  Express (src/app.js)                │
│ (web/mobile)│                     │  • JSON body parser                  │
└─────────────┘                     │  • /api/v1/* routes                  │
                                    │  • 404 / 500 handlers                │
                                    └──────────────┬───────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    ▼                              ▼                              ▼
            ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
            │  Middlewares  │              │  Controllers  │              │  Email service │
            │ verifyToken   │              │ auth, services│              │ (nodemailer)   │
            │ requireAdmin  │              │ availability  │              └───────────────┘
            └───────┬───────┘              │ booking, admin│
                    │                    └───────┬───────┘
                    │                            │
                    │                    ┌───────▼───────┐
                    │                    │    Models     │
                    │                    │  (pg-promise) │
                    │                    └───────┬───────┘
                    │                            │
                    │                    ┌───────▼───────────────────────────┐
                    │                    │  PostgreSQL                       │
                    │                    │  • Tables: users, bookings, …   │
                    │                    │  • EXCLUDE constraints (GiST)     │
                    │                    │  • Triggers: status, audit events │
                    │                    │  • Function: create_booking()     │
                    └────────────────────┤  • Views: upcoming_bookings      │
                                         └───────────────────────────────────┘
```

**Request flow (example — create booking):**

1. Client sends `POST /api/v1/bookings/createBooking` with JWT and body.
2. `verifyToken` loads user, checks active + verified.
3. Controller validates role, service, provider, slot vs availability/blocks.
4. Model calls `create_booking()` in PostgreSQL.
5. If another booking overlaps → DB raises `23P01` → API returns **409**.
6. On success → optional confirmation email; **201** with booking details.

---

## Project structure

```
├── database.json              # db-migrate config (uses DATABASE_URL)
├── package.json
├── migrations/
│   ├── 20260424114231-booking-system.js
│   └── sqls/
│       ├── *-up.sql           # Schema, constraints, triggers, functions
│       └── *-down.sql
└── src/
    ├── app.js                 # Express entry point
    ├── api/
    │   ├── controllers/       # HTTP handlers & validation
    │   ├── middlewares/       # JWT + admin role
    │   ├── models/            # Database calls
    │   ├── queries/           # Parameterized SQL
    │   ├── routes/            # Route definitions
    │   └── services/          # Email sender
    ├── config/
    │   ├── db/                # pg-promise connection
    │   └── email/             # Nodemailer transport
    └── lib/
        ├── schemas/           # Joi schemas (auth)
        └── utils/             # JWT, hashing, helpers
```

---

## API reference

Base URL: `/api/v1`  
Protected routes require header: `Authorization: Bearer <JWT>`

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | API status message |

### Authentication — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | No | Customer registration |
| `POST` | `/verify-email` | No | Verify OTP |
| `POST` | `/resend-otp` | No | Resend verification OTP |
| `POST` | `/forgot-password` | No | Request password reset |
| `POST` | `/reset-password` | No | Reset password with token |
| `POST` | `/login` | No | Login, returns JWT |
| `GET` | `/me` | JWT | Current user profile |
| `POST` | `/provider/register` | No | Provider registration |
| `POST` | `/provider/setup` | JWT | Complete provider business profile |

### Services — `/services`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/createService` | JWT (provider) | Create service |
| `GET` | `/` | JWT | List services (`?provider_id=`) |
| `GET` | `/:id` | JWT | Get one service |
| `PATCH` | `/:id` | JWT (provider) | Update service |
| `PATCH` | `/:id/deactivate` | JWT (provider) | Deactivate service |

### Availability — `/availability`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/setAvailability` | JWT (provider) | Set weekly schedule (once) |
| `GET` | `/getAvailability` | JWT (provider) | Get own schedule |
| `PUT` | `/updateAvailability/:id` | JWT (provider) | Update one day rule |
| `GET` | `/getSlots` | JWT | Available slots (`?provider_id=&service_id=&date=YYYY-MM-DD`) |

### Bookings — `/bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/createBooking` | JWT (customer) | Create booking |
| `GET` | `/getBookings` | JWT | List own bookings (customer or provider) |
| `GET` | `/getBooking/:id` | JWT | Get one booking (owner, provider, or admin) |
| `PATCH` | `/cancelBooking/:id` | JWT | Cancel (customer or provider) |
| `PATCH` | `/confirmBooking/:id` | JWT (provider) | Confirm pending booking |
| `PATCH` | `/completeBooking/:id` | JWT (provider) | Mark confirmed booking completed |

### Admin — `/admin`

All routes require JWT + `admin` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/getStats` | Platform statistics |
| `GET` | `/allUsers` | List users (filters: `role`, `is_active`, `search`, pagination) |
| `GET` | `/users/:id` | User detail |
| `PATCH` | `/users/:id/suspend` | Suspend user |
| `PATCH` | `/users/:id/activate` | Activate user |
| `PATCH` | `/users/:id/make-admin` | Grant admin role |
| `PATCH` | `/users/:id/remove-admin` | Remove admin role |
| `GET` | `/allProviders` | List providers |
| `GET` | `/providers/:id` | Provider detail |
| `GET` | `/allBookings` | List all bookings |
| `GET` | `/bookings/:id` | Booking detail |

### Standard response shape

```json
{
  "status": "success",
  "code": 200,
  "message": "Human-readable message",
  "data": {}
}
```

Errors use `"status": "error"` and an appropriate HTTP status (`401`, `403`, `404`, `409`, `422`, etc.). List endpoints may include `pagination`.

---

## Database schema (high level)

**Implemented and used by the API**

- `users` — accounts, roles, verification, suspension
- `service_providers` — business profiles (includes `timezone` column; scheduling logic currently uses UTC)
- `services` — name, duration, price, active flag
- `availability_rules` — per weekday: open/closed, hours, optional break
- `bookings` — `booking_period` (`tstzrange`), status lifecycle
- `provider_blocks` — read when computing slots / creating bookings (no create/update API yet)
- `booking_events` — populated by trigger on status change
- `system_audit_logs` — admin actions from application code

**Present in migrations, not fully exposed via API**

- `booking_idempotency_keys` — safe retry of `createBooking` (planned)
- `notifications` — outbound notification queue (planned)

**PostgreSQL features worth noting**

- `EXCLUDE USING GIST` on overlapping `booking_period` (per provider and per user, for active statuses)
- `create_booking()` function — insert booking + initial event
- Triggers — `updated_at`, booking status transitions, event logging

---

## Validation

- Most endpoints validate input in **controllers** (manual checks).
- **`src/lib/schemas/schema.auth.js`** defines a Joi `registerSchema` (stricter name, email, phone, password rules). It is **not imported by any route yet**. To use it, add a small validation middleware on `POST /auth/register` and `POST /auth/provider/register` that runs `registerSchema.validate(req.body)` and returns `422` on failure. Until then, registration uses controller-level validation only.

---

## Environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/booking_db

# JWT (required in production — no default fallback)
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=2h

# Email — Gmail SMTP (required for OTP / booking emails)
NODEMAILER_USER=your@gmail.com
NODEMAILER_APP_PASSWORD=your-app-password
```

For migrations, `database.json` reads `DATABASE_URL` in the `development` environment.

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (with extensions `pgcrypto`, `btree_gist`)
- [db-migrate](https://db-migrate.readthedocs.io/) CLI installed globally, **or** add `db-migrate` and `db-migrate-pg` as devDependencies

### Install and run

```bash
npm install
```

Run migrations (from project root):

```bash
# If db-migrate is installed globally:
db-migrate up

# Or via npx after adding db-migrate to package.json:
npx db-migrate up
```

Start the API:

```bash
npm run dev    # development with nodemon
npm run start  # production
```

Verify: `GET http://localhost:3000/` should return a JSON welcome message.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm run start` | Start with node |
| `npm test` | Not implemented yet |

---

## Key design decisions

### Double booking

Application code checks availability before insert. The **authoritative** guarantee is PostgreSQL: duplicate overlapping active bookings raise exclusion violation `23P01`, returned to clients as **409** with a clear message.

### Slot listing vs booking (race)

`GET /availability/getSlots` is read-only. Between listing slots and `createBooking`, another user may take a slot. The create endpoint must still succeed or fail based on DB constraints—not on stale slot lists.

### Time zones

Dates and slots are computed using **UTC** (`Z` suffix in ISO strings). Providers have a `timezone` field in the database but it is not yet applied in slot or booking validation.

---

## Roadmap / known gaps

See [GitHub issues] or track locally:

- [ ] Wire Joi schemas (or remove unused file)
- [ ] `.env.example` committed to repo
- [ ] Automated tests (integration tests for auth, slots, booking 409)
- [ ] API collection (Postman or OpenAPI)
- [ ] Provider block CRUD endpoints
- [ ] Booking idempotency header support
- [ ] Use `service_providers.timezone` in scheduling
- [ ] Security hardening (required `JWT_SECRET`, crypto OTP, rate limits, Helmet)
- [ ] Fix registration email order (send after DB success)
- [ ] Add `db-migrate` to `package.json` dependencies

---

## License

ISC
