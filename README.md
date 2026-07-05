# Appointment and Booking System

A backend REST API for appointment booking and service management. The system supports three roles: customers, providers, and admins.

- Customers register, verify their account, browse provider availability, and book services.
- Providers register, set up a business profile, manage services, define weekly availability, and handle bookings.
- Admins view platform stats, manage users and providers, and review bookings.

Built with Node.js, Express 5, PostgreSQL, `pg-promise`, and `jest`.

##  API Documentation
You can view the complete API documentation, including endpoint descriptions, request parameters, and example JSON responses here:

[Live Postman Documentation](https://documenter.getpostman.com/view/50548688/2sBY4HV4Wx)

## Key Features
- Email verification with OTP on registration
- Password reset flow using email OTP
- Provider business profile setup
- Provider service creation, updates, and soft deactivation
- Weekly availability rules with open/closed days and break periods
- Slot generation for available appointment times
- Booking creation with database-level double-booking protection
- Booking lifecycle actions: confirm, complete, cancel
- Role-based access control for customer, provider, and admin flows
- Admin dashboard endpoints for stats, users, providers, and bookings
- Structured request validation using Joi
- Gmail SMTP email delivery via Nodemailer



## Architecture
- `src/app.js` - Express app setup, middleware, routes, and error handling
- `src/api/routes/` - route definitions by feature domain
- `src/api/controllers/` - request handling and business logic
- `src/api/models/` - database interactions using SQL queries
- `src/api/queries/` - raw SQL strings for CRUD operations
- `src/api/middlewares/` - authorization and validation middleware
- `src/api/services/` - external services such as email sending
- `src/config/` - database and email configuration
- `src/lib/` - utility helpers, hashing, and validation schemas
- `tests/` - unit and integration tests
- `migrations/` - database migration scripts

---

## Tech Stack
- Node.js (ESM)
- Express 5
- PostgreSQL
- pg-promise
- Joi validation
- bcryptjs password hashing
- jsonwebtoken authentication
- nodemailer email delivery
- db-migrate database migrations
- Jest + Supertest testing

---

## Installation

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd appointment-and-booking-system
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and populate values:

   - `PORT`
   - `HOST`
   - `DATABASE_URL`
   - `DATABASE_URL_TEST` (required for tests)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `NODEMAILER_USER`
   - `NODEMAILER_APP_PASSWORD`

4. Run database migrations:

   ```bash
   npm run migrate:up
   ```

5. Start the server in development:

   ```bash
   npm run dev
   ```

6. Start the server in production mode:

   ```bash
   npm start
   ```

---

## Environment Variables

Required variables are defined in `.env.example`.

- `PORT` - server port
- `HOST` - server host
- `NODE_ENV` - `development`, `test`, or `production`
- `DATABASE_URL` - PostgreSQL connection string for app database
- `DATABASE_URL_TEST` - PostgreSQL connection string for tests
- `JWT_SECRET` - secret for signing JSON Web Tokens
- `JWT_EXPIRES_IN` - token expiry (default `2h`)
- `NODEMAILER_USER` - Gmail address used to send email
- `NODEMAILER_APP_PASSWORD` - Gmail app password for SMTP


 Note: `src/app.js` does not start the HTTP server when `NODE_ENV === 'test'`.


## API Base URL

All API endpoints are mounted under:
```text
/api/v1
```

### Auth
- `POST /api/v1/auth/register` - customer registration
- `POST /api/v1/auth/provider/register` - provider registration
- `POST /api/v1/auth/verify-email` - verify email with OTP
- `POST /api/v1/auth/resend-otp` - resend email OTP
- `POST /api/v1/auth/forgot-password` - request password reset OTP
- `POST /api/v1/auth/reset-password` - reset password with OTP
- `POST /api/v1/auth/login` - login and receive JWT
- `GET /api/v1/auth/me` - authenticated user profile
- `POST /api/v1/auth/provider/setup` - provider business profile setup

### Services

- `POST /api/v1/services/createService` - create a service (provider only)
- `GET /api/v1/services` - list services for authenticated user
- `GET /api/v1/services/:id` - get service detail
- `PATCH /api/v1/services/:id` - update service
- `PATCH /api/v1/services/:id/deactivate` - deactivate service

### Availability

- `POST /api/v1/availability/setAvailability` - set weekly availability rules (provider only)
- `GET /api/v1/availability/getAvailability?provider_id=...` - get provider availability rules
- `PUT /api/v1/availability/updateAvailability/:id` - update one availability rule
- `GET /api/v1/availability/getSlots?provider_id=...&service_id=...&date=YYYY-MM-DD` - get available slots for a provider and service

### Bookings

- `POST /api/v1/bookings/createBooking` - create a booking (customer only)
- `GET /api/v1/bookings/getBookings` - list bookings for customer or provider
- `GET /api/v1/bookings/getBooking/:id` - get booking details
- `PATCH /api/v1/bookings/cancelBooking/:id` - cancel a booking
- `PATCH /api/v1/bookings/confirmBooking/:id` - confirm a booking (provider only)
- `PATCH /api/v1/bookings/completeBooking/:id` - mark booking completed (provider only)

### Admin
Admin endpoints require authenticated admin JWT.

- `GET /api/v1/admin/getStats` - platform statistics
- `GET /api/v1/admin/allUsers` - list users
- `GET /api/v1/admin/users/:id` - get user detail
- `PATCH /api/v1/admin/users/:id/suspend` - suspend a user
- `PATCH /api/v1/admin/users/:id/activate` - activate a user
- `PATCH /api/v1/admin/users/:id/make-admin` - promote a user to admin
- `PATCH /api/v1/admin/users/:id/remove-admin` - demote admin
- `GET /api/v1/admin/allProviders` - list providers
- `GET /api/v1/admin/providers/:id` - get provider detail
- `GET /api/v1/admin/allBookings` - list bookings
- `GET /api/v1/admin/bookings/:id` - get booking detail

---

## Request Validation

Validation is handled with Joi in `src/lib/schemas`.

- `auth` routes validate registration, login, OTP, password reset, and provider profile data
- `service` routes validate service creation and updates
- `availability` routes validate weekly rule structure, time formats, and query params
- `booking` routes validate booking creation payload and cancellation reason

---

## Important Implementation Details

- The system uses JWT authentication and protected routes with `verifyToken` middleware.
- Providers must verify email and create a business profile before configuring availability.
- Booking creation checks provider availability and breaks, and computes `end_at` using service duration.
- Database-level exclusion constraint handles concurrent double-booking attempts safely.
- Email delivery is performed through Gmail SMTP using `nodemailer`.
- Database connections choose `DATABASE_URL_TEST` when `NODE_ENV === 'test'`.

---

## Scripts
- `npm run dev` - start development server with `nodemon`
- `npm start` - start server with Node.js
- `npm test` - run Jest tests once
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - generate coverage report
- `npm run migrate:up` - apply database migrations
- `npm run migrate:down` - rollback database migrations

---

## Testing
1. Configure `DATABASE_URL_TEST` in `.env`
2. Run:

   ```bash
   npm test
   ```

 
Tests use Jest and Supertest. The app avoids opening the HTTP listener during test execution.


## Notes for Production

- Use secure credentials for `JWT_SECRET` and email SMTP.
- Do not commit `.env` or credentials to source control.
- Prefer `DATABASE_URL` for production Postgres and `DATABASE_URL_TEST` for CI/test environments.
- Ensure Gmail uses an App Password if 2FA is enabled.
- Consider adding a proper API specification (OpenAPI/Swagger) for client integration.


## Folder Structure

```text
appointment-and-booking-system/
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
│   │   └── services/`
│   ├── config/
│   └── lib/
└── tests/
    ├── integrationTests/
    └── unitTests/
```
