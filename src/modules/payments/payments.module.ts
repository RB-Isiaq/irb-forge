import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { WebhookHandler } from './webhooks/webhook.handler';
import { StripeProvider } from './providers/stripe.provider';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), SubscriptionsModule],
  controllers: [PaymentsController, WebhookHandler],
  providers: [
    PaymentsRepository,
    PaymentsService,
    StripeProvider,
    OrgRolesGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
