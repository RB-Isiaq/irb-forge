export const EMAIL_QUEUE = 'email';

export const EmailJobName = {
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  WELCOME: 'welcome',
} as const;

export type EmailJobName = (typeof EmailJobName)[keyof typeof EmailJobName];

export interface VerifyEmailJobData {
  to: string;
  token: string;
}

export interface ResetPasswordJobData {
  to: string;
  token: string;
}

export interface WelcomeJobData {
  to: string;
  firstName: string | null;
}

export type EmailJobData =
  | VerifyEmailJobData
  | ResetPasswordJobData
  | WelcomeJobData;
