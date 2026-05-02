# IRB Forge

A multi-tenant SaaS platform for mentorship groups and communities. Organizations can manage members, run cohort programs, and monetize via subscriptions.

> Active development — features are being added incrementally.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL |
| Cache / Queues | Redis + BullMQ |
| Auth | JWT + Refresh Tokens (Passport.js) |
| Payments | Stripe + Paystack |
| Email | Nodemailer + Handlebars |
| Validation | class-validator + class-transformer |

## Getting Started

**Prerequisites:** Node.js ≥ 20, npm ≥ 10

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Start dev server with hot reload
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Scripts

```bash
npm run start:dev     # Development with hot reload
npm run build         # Compile TypeScript
npm run start:prod    # Run compiled output
npm run lint          # ESLint
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Test coverage
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/irb_forge
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=redis://localhost:6379
MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Architecture

Domain-driven modular structure following strict layering:

```
Controller → Service → Repository → Database
```

Each module is self-contained with its own controllers, services, repositories, entities, and DTOs. Cross-module communication uses direct calls for atomic operations and events for side effects. All email sending goes through a BullMQ queue — never inline in the request cycle.

## License

MIT
