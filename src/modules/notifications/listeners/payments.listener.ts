import { Injectable } from '@nestjs/common';
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
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('payment.success', { async: true })
  async handlePaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
    const org = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { id: event.organizationId } });
    if (!org) return;

    const owner = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: org.ownerId } });
    if (!owner) return;

    await this.notificationsService.sendPaymentConfirmationEmail(
      owner.email,
      org.name,
      event.amount,
      event.currency,
    );
  }
}
