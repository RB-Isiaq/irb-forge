import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../services/notifications.service';

interface AuthRegisteredEvent {
  userId: string;
  email: string;
  verificationToken: string;
}

interface AuthForgotPasswordEvent {
  email: string;
  token: string;
}

interface AuthVerificationResentEvent {
  email: string;
  verificationToken: string;
}

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('auth.registered', { async: true })
  async handleRegistered(payload: AuthRegisteredEvent): Promise<void> {
    this.logger.log(`Sending verification + welcome email to ${payload.email}`);
    try {
      await Promise.all([
        this.notificationsService.sendWelcomeEmail(payload.email, null),
        this.notificationsService.sendVerificationEmail(
          payload.email,
          payload.verificationToken,
        ),
      ]);
    } catch (err) {
      this.logger.error(
        `Failed to send registration emails to ${payload.email}`,
        err,
      );
    }
  }

  @OnEvent('auth.verificationResent', { async: true })
  async handleVerificationResent(
    payload: AuthVerificationResentEvent,
  ): Promise<void> {
    this.logger.log(`Sending resend verification email to ${payload.email}`);
    try {
      await this.notificationsService.sendVerificationEmail(
        payload.email,
        payload.verificationToken,
      );
    } catch (err) {
      this.logger.error(
        `Failed to resend verification to ${payload.email}`,
        err,
      );
    }
  }

  @OnEvent('auth.forgotPassword', { async: true })
  async handleForgotPassword(payload: AuthForgotPasswordEvent): Promise<void> {
    this.logger.log(`Sending password reset email to ${payload.email}`);
    try {
      const frontendUrl = this.config.getOrThrow<string>('frontendUrl');
      const resetUrl = `${frontendUrl}/reset-password?token=${payload.token}`;
      await this.notificationsService.sendPasswordResetEmail(
        payload.email,
        resetUrl,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send password reset to ${payload.email}`,
        err,
      );
    }
  }
}
