import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { StripeProvider } from '../../payments/providers/stripe.provider';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subsRepo: SubscriptionsRepository,
    private readonly stripeProvider: StripeProvider,
    private readonly config: ConfigService,
  ) {}

  async getOrCreate(organizationId: string): Promise<Subscription> {
    return this.subsRepo.getOrCreate(organizationId);
  }

  async getByOrg(organizationId: string): Promise<Subscription> {
    const sub = await this.subsRepo.getOrCreate(organizationId);
    return sub;
  }

  async createCheckoutSession(
    org: Organization,
    owner: User,
  ): Promise<{ url: string }> {
    const proPriceId = this.config.get<string>('stripe.proPriceId');
    if (!proPriceId) {
      throw new BadRequestException(
        'Stripe pro price not configured. Set STRIPE_PRO_PRICE_ID in environment.',
      );
    }

    const sub = await this.subsRepo.getOrCreate(org.id);

    if (
      sub.plan === SubscriptionPlan.PRO &&
      sub.status === SubscriptionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Organization already has an active pro subscription',
      );
    }

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripeProvider.client.customers.create(
        {
          email: owner.email,
          name: org.name,
          metadata: { organizationId: org.id, orgSlug: org.slug },
        },
        { idempotencyKey: `customer-create-${org.id}` },
      );
      customerId = customer.id;
      await this.subsRepo.updateCustomerId(sub.id, customerId);
    }

    const frontendUrl = this.config.getOrThrow<string>('frontendUrl');
    const session = await this.stripeProvider.client.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: proPriceId, quantity: 1 }],
        success_url: `${frontendUrl}/orgs/${org.slug}/billing?subscription=success`,
        cancel_url: `${frontendUrl}/orgs/${org.slug}/billing?subscription=cancelled`,
        metadata: { organizationId: org.id },
      },
      { idempotencyKey: `checkout-${org.id}-${Date.now()}` },
    );

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }

    return { url: session.url };
  }

  async cancelSubscription(organizationId: string): Promise<void> {
    const sub = await this.subsRepo.findByOrg(organizationId);
    if (!sub) throw new NotFoundException('No subscription found');
    if (!sub.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription to cancel');
    }

    await this.stripeProvider.client.subscriptions.cancel(
      sub.stripeSubscriptionId,
    );
    await this.subsRepo.cancel(sub.stripeSubscriptionId);
  }

  async activate(
    organizationId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodEnd: Date | null,
  ): Promise<void> {
    await this.subsRepo.activate(
      organizationId,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd,
    );
  }

  async updateStatus(
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
    currentPeriodEnd?: Date,
  ): Promise<void> {
    await this.subsRepo.updateStatus(
      stripeSubscriptionId,
      status,
      currentPeriodEnd,
    );
  }

  async handleDeleted(stripeSubscriptionId: string): Promise<void> {
    await this.subsRepo.cancel(stripeSubscriptionId);
  }
}
