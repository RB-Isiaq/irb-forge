# IRB Forge

A multi-tenant SaaS platform for mentorship groups and communities. Organizations can manage members, run cohort programs, and monetize via subscriptions.

> Active development — built weekend by weekend. See build progress below.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL (Neon) |
| Cache / Queues | Redis + BullMQ |
| Auth | JWT + Refresh Tokens + Google OAuth |
| Payments | Stripe |
| Email | Nodemailer + Handlebars (Mailtrap in dev) |
| Validation | class-validator + class-transformer |

## Getting Started

**Prerequisites:** Node.js ≥ 20, npm ≥ 10, PostgreSQL, Redis

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Start dev server with hot reload
npm run start:dev
```

API: `http://localhost:3000/api`
Swagger docs: `http://localhost:3000/api/docs`

## Scripts

```bash
npm run start:dev     # Development with hot reload
npm run build         # Compile TypeScript
npm run start:prod    # Run compiled output
npm run lint          # ESLint (auto-fix)
npm run lint:check    # ESLint (check only, used in CI)
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Test coverage
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/irb_forge
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=redis://localhost:6379
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=
MAIL_PASS=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=placeholder
GOOGLE_CLIENT_ID=
```

## Architecture

Domain-driven modular structure. Strict layering:

```
Controller (HTTP only) → Service (business logic) → Repository (DB queries) → Database
```

Cross-module communication:
- **Direct calls** — same business transaction, must rollback together
- **Events** — side effects (e.g. send email after registration)
- **Queues** — all email sending via BullMQ, never inline in the request cycle

## API Response Shape

All endpoints return a consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { },
  "message": "Human-readable context",
  "timestamp": "2026-05-03T14:00:00.000Z"
}
```

Errors:
```json
{
  "success": false,
  "statusCode": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "details": []
  },
  "path": "/api/auth/login",
  "timestamp": "2026-05-03T14:00:00.000Z"
}
```

## Build Progress

| Module | Status | Endpoints |
|--------|--------|-----------|
| Auth + Users | ✅ Complete | 12 endpoints |
| Organizations + Memberships | 🔜 Weekend 2 | — |
| Invitations | 🔜 Weekend 2 | — |
| Programs + Enrollments | 🔜 Weekend 3 | — |
| Messages | 🔜 Weekend 3 | — |
| Subscriptions + Payments | 🔜 Weekend 4 | — |

### Auth Module (Complete)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register + receive verification OTP |
| POST | `/auth/verify-email` | No | Verify email with 6-digit OTP |
| POST | `/auth/resend-verification` | No | Resend verification OTP |
| POST | `/auth/login` | No | Email/password login |
| POST | `/auth/google` | No | Google Sign-In (ID token exchange) |
| POST | `/auth/refresh` | Refresh token | Rotate token pair |
| POST | `/auth/logout` | Yes | Invalidate session |
| POST | `/auth/change-password` | Yes | Change password (invalidates all sessions) |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Reset password with email token |
| GET | `/users/me` | Yes | Get current user profile |
| PATCH | `/users/me` | Yes | Update profile fields |

## License

MIT
