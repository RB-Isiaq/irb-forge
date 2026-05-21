import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { StripeProvider } from '../payments/providers/stripe.provider';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsRepository,
    SubscriptionsService,
    StripeProvider,
    OrgRolesGuard,
  ],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
