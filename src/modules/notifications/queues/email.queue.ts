export const EMAIL_QUEUE = 'email';

export const EmailJobName = {
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  WELCOME: 'welcome',
  INVITE: 'invite',
  PAYMENT_CONFIRMATION: 'payment-confirmation',
} as const;

export type EmailJobName = (typeof EmailJobName)[keyof typeof EmailJobName];

export interface VerifyEmailJobData {
  to: string;
  token: string;
}

export interface ResetPasswordJobData {
  to: string;
  resetUrl: string;
}

export interface WelcomeJobData {
  to: string;
  firstName: string | null;
}

export interface InviteJobData {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  declineUrl: string;
}

export interface PaymentConfirmationJobData {
  to: string;
  orgName: string;
  amount: number;
  currency: string;
  date: string;
}

export type EmailJobData =
  | VerifyEmailJobData
  | ResetPasswordJobData
  | WelcomeJobData
  | InviteJobData
  | PaymentConfirmationJobData;
