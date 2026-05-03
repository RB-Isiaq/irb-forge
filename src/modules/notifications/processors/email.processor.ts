import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import {
  EMAIL_QUEUE,
  EmailJobName,
  VerifyEmailJobData,
  ResetPasswordJobData,
  WelcomeJobData,
} from '../queues/email.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('mail.host'),
      port: config.getOrThrow<number>('mail.port'),
      auth: {
        user: config.getOrThrow<string>('mail.user'),
        pass: config.getOrThrow<string>('mail.pass'),
      },
    });
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job: ${job.name}`);

    switch (job.name) {
      case EmailJobName.VERIFY_EMAIL:
        await this.handleVerifyEmail(job.data as VerifyEmailJobData);
        break;
      case EmailJobName.RESET_PASSWORD:
        await this.handleResetPassword(job.data as ResetPasswordJobData);
        break;
      case EmailJobName.WELCOME:
        await this.handleWelcome(job.data as WelcomeJobData);
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }

  private async handleVerifyEmail(data: VerifyEmailJobData): Promise<void> {
    const html = this.renderTemplate('verify-email', { otp: data.token });
    await this.send(
      data.to,
      `Your IRB Forge verification code: ${data.token}`,
      html,
    );
  }

  private async handleResetPassword(data: ResetPasswordJobData): Promise<void> {
    const html = this.renderTemplate('reset-password', { token: data.token });
    await this.send(data.to, 'Reset your password — IRB Forge', html);
  }

  private async handleWelcome(data: WelcomeJobData): Promise<void> {
    const html = this.renderTemplate('welcome', {
      firstName: data.firstName ?? '',
    });
    await this.send(data.to, 'Welcome to IRB Forge', html);
  }

  private resolveTemplatesDir(): string {
    // dist/modules/notifications/processors -> dist/modules/notifications/templates
    const distDir = path.join(__dirname, '..', 'templates');
    if (fs.existsSync(distDir)) return distDir;
    // Fallback: read directly from src during development
    return path.join(
      process.cwd(),
      'src',
      'modules',
      'notifications',
      'templates',
    );
  }

  private renderTemplate(
    name: string,
    context: Record<string, string>,
  ): string {
    const templatePath = path.join(this.resolveTemplatesDir(), `${name}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf-8');
    return handlebars.compile(source)(context);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"IRB Forge" <${this.config.getOrThrow<string>('mail.user')}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }
}
