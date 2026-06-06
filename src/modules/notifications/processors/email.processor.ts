import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailSenderService } from '../services/email-sender.service';
import {
  EMAIL_QUEUE,
  EmailJobName,
  VerifyEmailJobData,
  ResetPasswordJobData,
  WelcomeJobData,
  InviteJobData,
  PaymentConfirmationJobData,
} from '../queues/email.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailSender: EmailSenderService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job: ${job.name}`);

    switch (job.name) {
      case EmailJobName.VERIFY_EMAIL: {
        const d = job.data as VerifyEmailJobData;
        await this.emailSender.sendVerificationEmail(d.to, d.token);
        break;
      }
      case EmailJobName.RESET_PASSWORD: {
        const d = job.data as ResetPasswordJobData;
        await this.emailSender.sendPasswordResetEmail(d.to, d.resetUrl);
        break;
      }
      case EmailJobName.WELCOME: {
        const d = job.data as WelcomeJobData;
        await this.emailSender.sendWelcomeEmail(d.to, d.firstName);
        break;
      }
      case EmailJobName.INVITE: {
        const d = job.data as InviteJobData;
        await this.emailSender.sendInviteEmail(
          d.to,
          d.orgName,
          d.inviterName,
          d.role,
          d.acceptUrl,
          d.declineUrl,
        );
        break;
      }
      case EmailJobName.PAYMENT_CONFIRMATION: {
        const d = job.data as PaymentConfirmationJobData;
        await this.emailSender.sendPaymentConfirmationEmail(
          d.to,
          d.orgName,
          d.amount,
          d.currency,
          d.date,
        );
        break;
      }
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
