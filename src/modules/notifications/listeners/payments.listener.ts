import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../services/notifications.service';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

interface PaymentSuccessEvent {
  organizationId: string;
  amount: number;
  currency: string;
}

@Injectable()
export class PaymentsListener {
  private readonly logger = new Logger(PaymentsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('payment.success', { async: true })
  async handlePaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
    this.logger.log(`payment.success received for org ${event.organizationId}`);

    const org = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { id: event.organizationId } });
    if (!org) {
      this.logger.warn(`Org not found for payment: ${event.organizationId}`);
      return;
    }

    const owner = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: org.ownerId } });
    if (!owner) {
      this.logger.warn(`Owner not found for org: ${org.id}`);
      return;
    }

    this.logger.log(`Queuing payment confirmation email to ${owner.email}`);
    await this.notificationsService.sendPaymentConfirmationEmail(
      owner.email,
      org.name,
      event.amount,
      event.currency,
    );
  }
}
