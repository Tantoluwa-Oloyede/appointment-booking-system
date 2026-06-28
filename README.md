# Appointment and Booking System - Backend API

A REST API for appointment and service booking. Customers register, verify their accounts, browse availability, and create bookings. Providers create services, define weekly availability, and manage booking lifecycles. Admins can review users, providers, bookings, and system stats.

Built with Node.js (ESM), Express 5, PostgreSQL, and pg-promise.
## Core Features

- Email verification with OTP
- Password reset flow
- Provider business profile setup
- Service management for providers
- Weekly provider availability
- Available slot generation based on availability, service duration, bookings, and provider blocks
- Booking creation with double-booking protection at the database level
- Booking lifecycle actions: confirm, cancel, complete
- Admin moderation and audit logging

## Roles

| Role | Capabilities |
| --- | --- |
| Customer | Register, verify email, log in, reset password, view slots, create bookings, view own bookings, cancel own bookings |
| Provider | Register, complete business profile, create/update/deactivate services, set/update availability, confirm/complete/cancel bookings, view provider bookings |
| Admin | View stats, list users/providers/bookings, view details, suspend/activate users, promote/demote admins |

## Tech Stack

- Runtime/API: Node.js, Express 5
- Database: PostgreSQL
- Data access: pg-promise
- Migration tool: db-migrate, db-migrate-pg
- Authentication: jsonwebtoken, bcryptjs
- Validation: joi
- Email: nodemailer
- Testing: jest, supertest

## Project Structure

```text
├── babel.config.json
├── database.json
├── jest.config.js
├── migrations/
├── src/
│   ├── app.js
│   ├── api/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── queries/
│   │   ├── routes/
│   │   └── services/
│   ├── config/
│   └── lib/
└── tests/
    ├── integrationTests/
    └── unitTests/
```

## API Overview

Base path: `/api/v1`

### Auth

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-otp`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/provider/register`
- `POST /auth/provider/setup`

### Services

- `POST /services/createService`
- `GET /services?provider_id=...`
- `GET /services/:id`
- `PATCH /services/:id`
- `PATCH /services/:id/deactivate`

### Availability

- `POST /availability/setAvailability`
- `GET /availability/getAvailability?provider_id=...`
- `PUT /availability/updateAvailability/:id`
- `GET /availability/getSlots?provider_id=...&service_id=...&date=YYYY-MM-DD`

### Bookings

- `POST /bookings/createBooking`
- `GET /bookings/getBookings`
- `GET /bookings/getBooking/:id`
- `PATCH /bookings/cancelBooking/:id`
- `PATCH /bookings/confirmBooking/:id`
- `PATCH /bookings/completeBooking/:id`

### Admin

- `GET /admin/getStats`
- `GET /admin/allUsers`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id/suspend`
- `PATCH /admin/users/:id/activate`
- `PATCH /admin/users/:id/make-admin`
- `PATCH /admin/users/:id/remove-admin`
- `GET /admin/allProviders`
- `GET /admin/providers/:id`
- `GET /admin/allBookings`
- `GET /admin/bookings/:id`

## Why This Is Stronger Than Basic CRUD

- Double-booking is prevented with PostgreSQL exclusion constraints.
- Availability is computed from rules, breaks, existing bookings, and provider blocks.
- Bookings have a lifecycle, not just a create/read/update/delete flow.
- Admin actions are captured in audit logs.

## Local Setup

1. Install dependencies: `npm install`
2. Set up environment variables from `.env.example`
3. Run migrations: `npm run migrate:up`
4. Start development server: `npm run dev`
5. Start production server: `npm start`

## Scripts

- `npm test` - run tests once
- `npm run test:watch` - watch mode
- `npm run test:coverage` - coverage report
- `npm run dev` - run server with nodemon
- `npm start` - run server with node
- `npm run migrate:up` - apply migrations
- `npm run migrate:down` - rollback migrations

## Portfolio Checklist

- Finalize a clean README with setup, features, and API summary
- Add API documentation in Postman or Swagger
- Capture screenshots or a short demo video
- Prepare demo credentials for each role
- Confirm tests pass locally and record coverage if available
- Write a short project summary for your portfolio page
- Add a short explanation of the booking conflict solution
- List the stack and what each part is responsible for
- Remove any broken or outdated claims from the README and docs
- Make sure the repo name, screenshots, and descriptions all match the actual codebase

## License

ISC