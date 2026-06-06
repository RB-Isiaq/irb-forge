import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly resend: Resend;
  private partialsRegistered = false;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('mail.resendApiKey'));
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const html = this.renderTemplate('verify-email', { otp: token });
    await this.send(to, `Your IRB Forge verification code: ${token}`, html);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const html = this.renderTemplate('reset-password', { resetUrl });
    await this.send(to, 'Reset your password — IRB Forge', html);
  }

  async sendWelcomeEmail(to: string, firstName: string | null): Promise<void> {
    const html = this.renderTemplate('welcome', {
      firstName: firstName ?? '',
      year: new Date().getFullYear().toString(),
    });
    await this.send(to, 'Welcome to IRB Forge', html);
  }

  async sendInviteEmail(
    to: string,
    orgName: string,
    inviterName: string,
    role: string,
    acceptUrl: string,
    declineUrl: string,
  ): Promise<void> {
    const html = this.renderTemplate('invite', {
      orgName,
      inviterName,
      role,
      acceptUrl,
      declineUrl,
    });
    await this.send(
      to,
      `You've been invited to join ${orgName} on IRB Forge`,
      html,
    );
  }

  async sendPaymentConfirmationEmail(
    to: string,
    orgName: string,
    amount: number,
    currency: string,
    date: string,
  ): Promise<void> {
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);

    const html = this.renderTemplate('payment-confirmation', {
      orgName,
      amount: amountFormatted,
      date,
    });
    await this.send(to, 'Payment confirmed — IRB Forge Pro', html);
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

    const layoutPath = path.join(baseDir, 'layouts', 'main.hbs');
    handlebars.registerPartial('layout', fs.readFileSync(layoutPath, 'utf-8'));

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
  }

  private renderTemplate(
    name: string,
    context: Record<string, string>,
  ): string {
    this.registerPartials();
    const templatePath = path.join(this.resolveTemplatesDir(), `${name}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf-8');
    const logoUrl = this.config.get<string>('LOGO_URL', '');
    return handlebars.compile(source)({ ...context, logoUrl });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.config.getOrThrow<string>('mail.from');
    const { error } = await this.resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }
}
