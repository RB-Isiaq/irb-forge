import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  EmailJobName,
  VerifyEmailJobData,
  ResetPasswordJobData,
  WelcomeJobData,
  InviteJobData,
  PaymentConfirmationJobData,
} from '../queues/email.queue';

@Injectable()
export class NotificationsService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const data: VerifyEmailJobData = { to, token };
    await this.emailQueue.add(EmailJobName.VERIFY_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const data: ResetPasswordJobData = { to, resetUrl };
    await this.emailQueue.add(EmailJobName.RESET_PASSWORD, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendWelcomeEmail(to: string, firstName: string | null): Promise<void> {
    const data: WelcomeJobData = { to, firstName };
    await this.emailQueue.add(EmailJobName.WELCOME, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendPaymentConfirmationEmail(
    to: string,
    orgName: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    const data: PaymentConfirmationJobData = {
      to,
      orgName,
      amount,
      currency,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
    await this.emailQueue.add(EmailJobName.PAYMENT_CONFIRMATION, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendInviteEmail(
    to: string,
    orgName: string,
    inviterName: string,
    role: string,
    acceptUrl: string,
    declineUrl: string,
  ): Promise<void> {
    const data: InviteJobData = {
      to,
      orgName,
      inviterName,
      role,
      acceptUrl,
      declineUrl,
    };
    await this.emailQueue.add(EmailJobName.INVITE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
