import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EmailSenderService } from './email-sender.service';
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
  private readonly queueEnabled: boolean;

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    private readonly emailSender: EmailSenderService,
    private readonly config: ConfigService,
  ) {
    this.queueEnabled = config.get<boolean>('mail.queueEnabled') ?? false;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.queueEnabled) {
      await this.emailSender.sendVerificationEmail(to, token);
      return;
    }
    const data: VerifyEmailJobData = { to, token };
    await this.emailQueue.add(EmailJobName.VERIFY_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.queueEnabled) {
      await this.emailSender.sendPasswordResetEmail(to, resetUrl);
      return;
    }
    const data: ResetPasswordJobData = { to, resetUrl };
    await this.emailQueue.add(EmailJobName.RESET_PASSWORD, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async sendWelcomeEmail(to: string, firstName: string | null): Promise<void> {
    if (!this.queueEnabled) {
      await this.emailSender.sendWelcomeEmail(to, firstName);
      return;
    }
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
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!this.queueEnabled) {
      await this.emailSender.sendPaymentConfirmationEmail(
        to,
        orgName,
        amount,
        currency,
        date,
      );
      return;
    }
    const data: PaymentConfirmationJobData = {
      to,
      orgName,
      amount,
      currency,
      date,
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
    if (!this.queueEnabled) {
      await this.emailSender.sendInviteEmail(
        to,
        orgName,
        inviterName,
        role,
        acceptUrl,
        declineUrl,
      );
      return;
    }
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
