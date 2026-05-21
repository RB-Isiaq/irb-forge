import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeProvider {
  private readonly stripe: StripeClient;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('stripe.secretKey'),
    );
  }

  get client(): StripeClient {
    return this.stripe;
  }
}
