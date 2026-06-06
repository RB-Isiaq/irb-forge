export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM ?? 'IRB Forge <noreply@irb-forge.com>',
    // Set to true only on platforms with persistent processes (Railway, Render, Fly.io).
    // Leave false (default) on serverless platforms like Vercel.
    queueEnabled: process.env.EMAIL_QUEUE_ENABLED === 'true',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    proPriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  cors: {
    // Comma-separated list of allowed origins. Defaults to FRONTEND_URL.
    origins:
      process.env.CORS_ORIGINS ??
      process.env.FRONTEND_URL ??
      'http://localhost:3001',
  },
});
