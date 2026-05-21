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
  InviteJobData,
  PaymentConfirmationJobData,
} from '../queues/email.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: nodemailer.Transporter;
  private partialsRegistered = false;

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
      case EmailJobName.INVITE:
        await this.handleInvite(job.data as InviteJobData);
        break;
      case EmailJobName.PAYMENT_CONFIRMATION:
        await this.handlePaymentConfirmation(
          job.data as PaymentConfirmationJobData,
        );
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
    const html = this.renderTemplate('reset-password', {
      resetUrl: data.resetUrl,
    });
    await this.send(data.to, 'Reset your password — IRB Forge', html);
  }

  private async handleWelcome(data: WelcomeJobData): Promise<void> {
    const html = this.renderTemplate('welcome', {
      firstName: data.firstName ?? '',
      year: new Date().getFullYear().toString(),
    });
    await this.send(data.to, 'Welcome to IRB Forge', html);
  }

  private async handleInvite(data: InviteJobData): Promise<void> {
    const html = this.renderTemplate('invite', {
      orgName: data.orgName,
      inviterName: data.inviterName,
      role: data.role,
      acceptUrl: data.acceptUrl,
      declineUrl: data.declineUrl,
    });
    await this.send(
      data.to,
      `You've been invited to join ${data.orgName} on IRB Forge`,
      html,
    );
  }

  private async handlePaymentConfirmation(
    data: PaymentConfirmationJobData,
  ): Promise<void> {
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    const html = this.renderTemplate('payment-confirmation', {
      orgName: data.orgName,
      amount: amountFormatted,
      date: data.date,
    });
    await this.send(data.to, `Payment confirmed — IRB Forge Pro`, html);
  }

  private resolveTemplatesDir(): string {
    const distDir = path.join(__dirname, '..', 'templates');
    if (fs.existsSync(distDir)) return distDir;
    return path.join(
      process.cwd(),
      'src',
      'modules',
      'notifications',
      'templates',
    );
  }

  private registerPartials(): void {
    if (this.partialsRegistered) return;

    const baseDir = this.resolveTemplatesDir();

    // Register layout as a partial named 'layout'
    const layoutPath = path.join(baseDir, 'layouts', 'main.hbs');
    handlebars.registerPartial('layout', fs.readFileSync(layoutPath, 'utf-8'));

    // Register all files in partials/ directory by their filename (without .hbs)
    const partialsDir = path.join(baseDir, 'partials');
    fs.readdirSync(partialsDir).forEach((file) => {
      if (!file.endsWith('.hbs')) return;
      const name = file.replace('.hbs', '');
      handlebars.registerPartial(
        name,
        fs.readFileSync(path.join(partialsDir, file), 'utf-8'),
      );
    });

    this.partialsRegistered = true;
    this.logger.log('Email partials registered');
  }

  private renderTemplate(
    name: string,
    context: Record<string, string>,
  ): string {
    this.registerPartials();
    const templatePath = path.join(this.resolveTemplatesDir(), `${name}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf-8');
    // Inject logoUrl globally so every template's header partial can use it.
    // Set LOGO_URL in .env to a publicly hosted PNG (2× resolution recommended).
    // When unset the header falls back to the inline HTML table logo.
    const logoUrl = this.config.get<string>('LOGO_URL', '');
    return handlebars.compile(source)({ ...context, logoUrl });
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
