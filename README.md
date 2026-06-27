# IRB Forge

A multi-tenant SaaS API for mentorship communities. Organizations manage members with role-based access, run cohort programs, send email invitations, chat in group channels, and monetize via subscriptions.

**Stack:** NestJS · PostgreSQL · Redis + BullMQ · JWT + Google OAuth · Stripe · Resend + Handlebars

**Current state:** Weekends 1–4 complete plus org-scoped group channels — 57 endpoints across auth, users, organizations, memberships, invitations, programs, enrollments, messages, channels, subscriptions, and payments. Stripe billing integrated.

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

RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM=IRB Forge <noreply@yourdomain.com>

# false = direct Resend API (works on Vercel / serverless)
# true  = BullMQ queue (requires persistent process: Railway, Render, Fly.io)
EMAIL_QUEUE_ENABLED=false

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

npm run migration:generate -- src/database/migrations/<Name>  # diff entities vs DB, write a migration
npm run migration:run        # apply pending migrations
npm run migration:revert     # roll back the last migration
npm run migration:show       # list applied/pending migrations
```

Seed credentials (password `Password1`): `superadmin` (platform super_admin), `owner`, `admin`, `mentor`, `member`, `member2` — all at `@irb-seed.dev`.

### Schema changes & migrations

`synchronize` is only enabled when `NODE_ENV=development`, so local schema changes apply automatically on app start. Production (and any other environment) requires an explicit migration:

1. Change the entity locally and let `synchronize` apply it to your dev DB.
2. Run `npm run migration:generate -- src/database/migrations/<DescriptiveName>` — it diffs entities against the DB pointed to by `DATABASE_URL` and writes the exact SQL.
3. Commit the generated migration file.
4. Against production, point `DATABASE_URL` at the prod database and run `npm run migration:run` (there is no CI/CD step that does this automatically yet — it's a manual step after deploying schema changes).

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

**Pagination** — all list endpoints accept `?page=1&limit=20` (default: page 1, 20 items). Paginated responses use the shape `{ items, total, page, limit, pages }`. The one exception is channel messages, which use cursor pagination instead (`?before=&limit=`, response `{ items, nextCursor }`) — offset pagination is unstable on a feed that keeps getting new rows inserted at the head, which channel messages do (every client polls). See the Channels section below.

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
| POST | `/api/users/me/push-token` | Yes | Save Expo push token for mobile push notifications |

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

### Channels

Org-scoped group chat, separate from announcements above — any channel member can post, not just owner/admin/mentor. Every org gets an auto-created `general` channel that all members join automatically. Free plan orgs are limited to 1 channel; Pro orgs can create unlimited additional channels.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organizations/:slug/channels` | Yes | Create channel (owner/admin/mentor; free plan limited to 1) |
| GET | `/api/organizations/:slug/channels` | Yes | List channels I'm a member of |
| DELETE | `/api/organizations/:slug/channels/:channelId` | Yes | Delete channel (owner/admin; default channel cannot be deleted) |
| GET | `/api/organizations/:slug/channels/:channelId/members` | Yes | List channel members (channel creator or owner/admin) |
| POST | `/api/organizations/:slug/channels/:channelId/members` | Yes | Add member (channel creator or owner/admin) |
| DELETE | `/api/organizations/:slug/channels/:channelId/members/:userId` | Yes | Remove member (channel creator or owner/admin) |
| POST | `/api/organizations/:slug/channels/:channelId/messages` | Yes | Send message (any channel member) |
| GET | `/api/organizations/:slug/channels/:channelId/messages` | Yes | List messages, newest first — cursor-paginated via `?before=<ISO timestamp>&limit=` (default 20, max 100). Response is `{ items, nextCursor }`; pass `nextCursor` back as `before` to load older messages. `nextCursor` is `null` when there's no more history. |

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

Side effects (emails, push notifications) are dispatched via event emitter. Emails are delivered through Resend, with two modes controlled by `EMAIL_QUEUE_ENABLED`: direct API call (default, works on serverless) or BullMQ queue with retry (for persistent-process platforms). New org messages also trigger Expo push notifications to other members with a registered push token (stale tokens are cleared automatically). A failed email or push never fails the request.

---

## License

MIT
