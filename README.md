# Appointment and Booking System - Backend API 

A REST API for business where customers book time with a provider for a particular service. The system handles authentication, rols-based access, weekly availability ( for providers ), computed time slots and bookings with **postgreSQL enforcing that the same provider/customer cannot hold two overlapping active appointments [When two booking are trying to happen at the same time]**.

Built with **Node.js (ESM)**, **Express 5**, and **PostgreSQL** via **pg-promise**.

## What this project does
| ROLE |  CAPABILITIES |

**Customers** | Register, verify email (OTP), login, reset password, view availablie slots, create and manage their bookings. 
**Providers** | Register, complete business profile, manage services, set weekly availability, confirm/complete/cancel bookings for their business. 
**Admin** | Platform stats, list users/providers/bookings, suspend/activate users, promote/demote admins (with audit logging)

## Why it is more than basic CRUD

**Double-Booking Prevention** 
Active bookings (`pending`, `confirmed`) use PostgreSQL `EXCLUDE` constraints on `tstzrange` so two concurrent requests cannot claim the same slot for the same provider (or overlapping slots for the same user).

**Computed Availability**
Slots are derived from weekly rules, service duration, breaks, existing bookings, and provider blocks—not a hardcoded list.

**Booking lifecycle**
Status transitions (`pending` → `confirmed` / `cancelled` → `completed`) are constrained in the database.

**Audit trail** 
Booking status changes and admin actions are recorded in dedicated tables.


## Tech Stack

- **Runtime/API:** Node.js, Express (ESM)
- **Database:** PostgreSQL with `pg-promise`
- **Migrations:** `db-migrate`, `db-migrate-pg`
- **Auth/Security:** `jsonwebtoken`, `bcryptjs`, 
- **Email:** `nodemailer`


## Project Structure

├── database.json
├── .env
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
├── migrations/
│   ├── *.js
│   └── sqls/
├── src/
│   ├── app.js
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── controllers.admin.js
│   │   │   ├── controllers.auth.js
│   │   │   ├── controllers.availability.js
│   │   │   ├── controllers.booking.js
│   │   │   └── controllers.services.js
│   │   ├── middlewares/
│   │   │   ├── middlewares.admin.js
│   │   │   └── middlewares.auth.js
│   │   ├── models/
│   │   │   ├── models.admin.js
│   │   │   ├── models.auth.js
│   │   │   ├── models.availability.js
│   │   │   ├── models.booking.js
│   │   │   └── models.services.js
│   │   ├── queries/
│   │   │   ├── queries.admin.js
│   │   │   ├── queries.auth.js
│   │   │   ├── queries.availability.js
│   │   │   ├── queries.booking.js
│   │   │   └── queries.services.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── routes.admin.js
│   │   │   ├── routes.auth.js
│   │   │   ├── routes.availability.js
│   │   │   ├── routes.booking.js
│   │   │   └── routes.services.js
│   │   └── services/
│   │       └── email.js
│   ├── config/
│   │   ├── db/
│   │   │   └── index.js
│   │   └── email/
│   │       └── index.js
│   └── lib/
│       ├── schemas/
│       │   └── schema.auth.js
│       └── utils/
│           ├── utils.hash.js
│           └── utils.helpers.js
└── tests/
    ├── integrationTests/
    └── unitTests/
        └── controllers.auth.test.js


## Installation & Local Setup

1. **Clone the repository:**
   bash
   git clone https://github.com...
   cd appointment-and-booking-system
   

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
  .env.example .env
   Open the `.env.example` file and supply your local credentials

4. **Run database migrations:**
   bash
   npm run migrate:up
   
<!-- 
5. **Seed the database (Creates default Admin account):**
   ```bash
   npm run seed:admin
   ``` -->

6. **Start the application:**
   *   **Development mode**: `npm run dev`
   *   **Production mode**: `npm start`


## License
ISC