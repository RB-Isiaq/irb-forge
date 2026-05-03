import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('auth.registered', { async: true })
  async handleRegistered(payload: AuthRegisteredEvent): Promise<void> {
    this.logger.log(
      `Queuing verification + welcome email for ${payload.email}`,
    );
    await Promise.all([
      this.notificationsService.sendWelcomeEmail(payload.email, null),
      this.notificationsService.sendVerificationEmail(
        payload.email,
        payload.verificationToken,
      ),
    ]);
  }

  @OnEvent('auth.verificationResent', { async: true })
  async handleVerificationResent(
    payload: AuthVerificationResentEvent,
  ): Promise<void> {
    this.logger.log(`Queuing resend verification email for ${payload.email}`);
    await this.notificationsService.sendVerificationEmail(
      payload.email,
      payload.verificationToken,
    );
  }

  @OnEvent('auth.forgotPassword', { async: true })
  async handleForgotPassword(payload: AuthForgotPasswordEvent): Promise<void> {
    this.logger.log(`Queuing password reset email for ${payload.email}`);
    await this.notificationsService.sendPasswordResetEmail(
      payload.email,
      payload.token,
    );
  }
}
