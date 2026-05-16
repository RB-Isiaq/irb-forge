import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StripeProvider, StripeClient } from '../providers/stripe.provider';
import { PaymentsRepository } from '../repositories/payments.repository';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { SubscriptionStatus } from '../../subscriptions/enums/subscription-status.enum';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

// Derive Stripe event types from the SDK's instance rather than the namespace
type StripeWebhookEvent = ReturnType<
  StripeClient['webhooks']['constructEvent']
>;
type StripeCheckoutSession = Extract<
  StripeWebhookEvent['data']['object'],
  { object: 'checkout.session' }
>;
type StripeSubscription = Extract<
  StripeWebhookEvent['data']['object'],
  { object: 'subscription' }
>;
type StripeInvoice = Extract<
  StripeWebhookEvent['data']['object'],
  { object: 'invoice' }
>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  listByOrg(organizationId: string): Promise<Payment[]> {
    return this.paymentsRepo.findByOrg(organizationId);
  }

  async listByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<Payment>> {
    const [items, total] = await this.paymentsRepo.findByOrgPaginated(
      organizationId,
      page,
      limit,
    );
    return new PaginatedResponseDto(items, total, page, limit);
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: StripeWebhookEvent;

    try {
      event = this.stripeProvider.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.getOrThrow<string>('stripe.webhookSecret'),
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object, event.id);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSucceeded(event.data.object, event.id);
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: StripeCheckoutSession,
    eventId: string,
  ): Promise<void> {
    const s = session as unknown as Record<string, unknown>;
    const organizationId = (s['metadata'] as Record<string, string> | null)
      ?.organizationId;
    if (!organizationId) return;

    const existing = await this.paymentsRepo.findByEventId(eventId);
    if (existing) return;

    const stripeSubscriptionId = (s['subscription'] as string | null) ?? '';
    let currentPeriodEnd = new Date();

    if (stripeSubscriptionId) {
      const stripeSub =
        await this.stripeProvider.client.subscriptions.retrieve(
          stripeSubscriptionId,
        );
      currentPeriodEnd = new Date(
        (stripeSub as unknown as { current_period_end: number })
          .current_period_end * 1000,
      );
    }

    await this.subscriptionsService.activate(
      organizationId,
      (s['customer'] as string) ?? '',
      stripeSubscriptionId,
      currentPeriodEnd,
    );

    const payment = await this.paymentsRepo.record({
      organizationId,
      stripePaymentIntentId: (s['payment_intent'] as string | null) ?? null,
      stripeEventId: eventId,
      amount: (s['amount_total'] as number | null) ?? 0,
      currency: (s['currency'] as string | null) ?? 'usd',
      status: PaymentStatus.SUCCEEDED,
    });

    this.eventEmitter.emit('payment.success', {
      organizationId,
      amount: payment.amount,
      currency: payment.currency,
    });
  }

  private async handleSubscriptionUpdated(
    stripeSub: StripeSubscription,
  ): Promise<void> {
    const sub = stripeSub as unknown as Record<string, unknown>;
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      canceled: SubscriptionStatus.CANCELLED,
    };

    const rawStatus = sub['status'] as string;
    const status = statusMap[rawStatus] ?? SubscriptionStatus.ACTIVE;
    const currentPeriodEnd = new Date(
      (sub['current_period_end'] as number) * 1000,
    );

    await this.subscriptionsService.updateStatus(
      sub['id'] as string,
      status,
      currentPeriodEnd,
    );
  }

  private async handleSubscriptionDeleted(
    stripeSub: StripeSubscription,
  ): Promise<void> {
    const sub = stripeSub as unknown as Record<string, unknown>;
    await this.subscriptionsService.handleDeleted(sub['id'] as string);
  }

  private async handleInvoiceSucceeded(
    invoice: StripeInvoice,
    eventId: string,
  ): Promise<void> {
    const inv = invoice as unknown as Record<string, unknown>;
    if ((inv['billing_reason'] as string) === 'subscription_create') return;

    const existing = await this.paymentsRepo.findByEventId(eventId);
    if (existing) return;

    const subDetails = inv['subscription_details'] as Record<
      string,
      unknown
    > | null;
    const metadata = subDetails?.['metadata'] as Record<string, string> | null;
    const organizationId = metadata?.organizationId;
    if (!organizationId) return;

    await this.paymentsRepo.record({
      organizationId,
      stripePaymentIntentId: (inv['payment_intent'] as string | null) ?? null,
      stripeEventId: eventId,
      amount: inv['amount_paid'] as number,
      currency: inv['currency'] as string,
      status: PaymentStatus.SUCCEEDED,
    });
  }
}
