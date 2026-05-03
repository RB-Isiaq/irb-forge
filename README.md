# IRB Forge

A multi-tenant SaaS API for mentorship communities. Organizations can manage members with role-based access, run cohort programs, send email invitations, and monetize via subscriptions.

**Stack:** NestJS · PostgreSQL · Redis + BullMQ · JWT + Google OAuth · Stripe · Nodemailer + Handlebars

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

GOOGLE_CLIENT_ID=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
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
```

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
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |
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
| PATCH | `/api/organizations/:slug/members/:userId/role` | Yes | Update member role (owner/admin) |
| DELETE | `/api/organizations/:slug/members/me` | Yes | Leave organization |
| DELETE | `/api/organizations/:slug/members/:userId` | Yes | Remove member (owner/admin) |

### Invitations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/invitations` | Yes | Invite by email (owner/admin) |
| GET | `/api/organizations/:slug/invitations` | Yes | List pending invitations (owner/admin) |
| DELETE | `/api/organizations/:slug/invitations/:id` | Yes | Cancel invitation (owner/admin) |
| GET | `/api/invitations/preview?token=` | **No** | Preview invite details (public) |
| GET | `/api/invitations/me` | Yes | My pending invitation inbox |
| POST | `/api/invitations/accept` | Yes | Accept invitation |
| POST | `/api/invitations/decline` | Yes | Decline invitation |

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
