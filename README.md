# IRB Forge

A multi-tenant SaaS API for mentorship communities. Organizations manage members with role-based access, run cohort programs, send email invitations, and monetize via subscriptions.

**Stack:** NestJS · PostgreSQL · Redis + BullMQ · JWT + Google OAuth · Stripe · Nodemailer + Handlebars

**Current state:** Weekends 1–4 complete — 50 endpoints across auth, users, organizations, memberships, invitations, programs, enrollments, messages, subscriptions, and payments. Stripe billing integrated.

---

## Getting Started

**Prerequisites:** Node.js ≥ 20, PostgreSQL, Redis

```bash
npm install
cp .env.example .env   # fill in your values
npm run start:dev
```

- API: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/irb_forge

JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379

MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=
MAIL_PASS=

FRONTEND_URL=http://localhost:3001

# CORS — comma-separated. Defaults to FRONTEND_URL if not set.
# CORS_ORIGINS=https://app.irb-forge.com,https://admin.irb-forge.com

GOOGLE_CLIENT_ID=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=   # from: stripe listen --forward-to localhost:3000/api/webhooks/stripe
STRIPE_PRO_PRICE_ID=     # create a Product + Price in Stripe dashboard
```

---

## Scripts

```bash
npm run start:dev     # dev server with hot reload
npm run build         # compile TypeScript
npm run start:prod    # run compiled output
npm run test          # unit tests
npm run lint:check    # ESLint check (used in CI)
npm run lint          # ESLint auto-fix
npm run seed          # seed dev database (idempotent — wipes and recreates)
```

Seed credentials (password `Password1`): `superadmin` (platform super_admin), `owner`, `admin`, `mentor`, `member`, `member2` — all at `@irb-seed.dev`.

---

## API

All endpoints are prefixed `/api`. Every response follows a consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "Human-readable context",
  "timestamp": "2026-05-03T14:00:00.000Z"
}
```

Protected endpoints require `Authorization: Bearer <accessToken>`. Access tokens expire in 15 minutes — use `POST /api/auth/refresh` to rotate.

**Pagination** — all list endpoints accept `?page=1&limit=20` (default: page 1, 20 items). Paginated responses use the shape `{ items, total, page, limit, pages }`.

**Markdown** — `program.description` and `message.content` accept markdown. Rendering is the client's responsibility. Use markdown links to share resources (e.g. `[Syllabus](https://...)`)

---

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register — returns tokens + sends OTP email |
| POST | `/api/auth/verify-email` | No | Verify email with 6-digit OTP |
| POST | `/api/auth/resend-verification` | No | Resend OTP |
| POST | `/api/auth/login` | No | Email + password login |
| POST | `/api/auth/google` | No | Google Sign-In (ID token exchange) |
| POST | `/api/auth/refresh` | Refresh token | Rotate access + refresh token pair |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token + blacklist access token immediately |
| POST | `/api/auth/forgot-password` | No | Send password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with email token |
| POST | `/api/auth/change-password` | Yes | Change password (invalidates all sessions) |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update name fields |

### Organizations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations` | Yes | Create organization (verified users only) |
| GET | `/api/organizations` | Yes | List orgs I belong to |
| GET | `/api/organizations/:slug` | Yes | Get org by slug (members only) |
| PATCH | `/api/organizations/:slug` | Yes | Update org (owner/admin) |
| DELETE | `/api/organizations/:slug` | Yes | Delete org (owner only) |

### Members

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/organizations/:slug/members` | Yes | List members with user info |
| GET | `/api/organizations/:slug/members/me` | Yes | Get own membership + role |
| PATCH | `/api/organizations/:slug/members/:userId/role` | Yes | Update member role (owner/admin) |
| DELETE | `/api/organizations/:slug/members/me` | Yes | Leave organization |
| DELETE | `/api/organizations/:slug/members/:userId` | Yes | Remove member (owner/admin) |

### Invitations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/invitations` | Yes | Invite by email (owner/admin) |
| GET | `/api/organizations/:slug/invitations` | Yes | List pending invitations (owner/admin) |
| DELETE | `/api/organizations/:slug/invitations/:id` | Yes | Cancel invitation (owner/admin) |
| POST | `/api/organizations/:slug/invitations/:id/resend` | Yes | Resend invitation email (owner/admin) |
| GET | `/api/invitations/preview?token=` | **No** | Preview invite details (public, email flow) |
| GET | `/api/invitations/me` | Yes | My pending invitation inbox |
| POST | `/api/invitations/accept` | Yes | Accept invite via token (email flow) |
| POST | `/api/invitations/decline` | Yes | Decline invite via token (email flow) |
| PATCH | `/api/invitations/:id/accept` | Yes | Accept invite via ID (in-app inbox) |
| PATCH | `/api/invitations/:id/decline` | Yes | Decline invite via ID (in-app inbox) |

### Programs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/programs` | Yes | Create program (owner/admin/mentor) |
| GET | `/api/organizations/:slug/programs` | Yes | List all programs (all members) |
| GET | `/api/organizations/:slug/programs/:id` | Yes | Get single program (all members) |
| PATCH | `/api/organizations/:slug/programs/:id` | Yes | Update program (owner/admin; mentor — own only) |
| DELETE | `/api/organizations/:slug/programs/:id` | Yes | Delete program (owner/admin) |

### Enrollments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/programs/:programId/enrollments` | Yes | Enroll self (member only) |
| GET | `/api/organizations/:slug/programs/:programId/enrollments` | Yes | List enrolled users (owner/admin/mentor) |
| GET | `/api/organizations/:slug/programs/:programId/enrollments/me` | Yes | Check own enrollment status (all members) |
| DELETE | `/api/organizations/:slug/programs/:programId/enrollments/me` | Yes | Drop self from program |
| PATCH | `/api/organizations/:slug/programs/:programId/enrollments/:userId` | Yes | Mark enrollment completed/dropped (owner/admin/mentor) |
| GET | `/api/organizations/:slug/enrollments` | Yes | My enrollments across all org programs (all members) |

### Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/messages` | Yes | Send org-wide announcement (owner/admin/mentor) |
| GET | `/api/organizations/:slug/messages` | Yes | List announcements with author info — paginated |

### Subscriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/organizations/:slug/subscriptions` | Yes | Get current subscription (owner/admin) |
| POST | `/api/organizations/:slug/subscriptions/checkout` | Yes | Create Stripe checkout session — returns `{ url }` (owner only) |
| POST | `/api/organizations/:slug/subscriptions/cancel` | Yes | Cancel active subscription immediately (owner only) |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/organizations/:slug/payments` | Yes | Paginated payment history (owner/admin) |

### Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/webhooks/stripe` | **No** | Stripe event receiver — signature verified, do not call directly |

---

## Role System

### Platform roles (on every user)

| Role | Description |
|------|-------------|
| `user` | Default for all registered users |
| `super_admin` | Platform administration |

### Org membership roles (per organization)

| Role | Description |
|------|-------------|
| `owner` | Full control — auto-assigned on org creation |
| `admin` | Manage members and invitations |
| `mentor` | Create and lead programs |
| `member` | Enroll in programs, receive announcements |

---

## Architecture

Domain-driven modules. Strict layering — controllers handle HTTP only, services own business logic, repositories own DB queries.

```
Controller → Service → Repository → Database
```

Side effects (emails, notifications) are always async via event emitter → BullMQ queue → processor. A failed email never fails the request.

---

## License

MIT
