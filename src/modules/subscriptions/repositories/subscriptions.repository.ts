import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  findByOrg(organizationId: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { organizationId } });
  }

  findByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<Subscription | null> {
    return this.repo.findOne({ where: { stripeCustomerId } });
  }

  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.repo.findOne({ where: { stripeSubscriptionId } });
  }

  async getOrCreate(organizationId: string): Promise<Subscription> {
    const existing = await this.findByOrg(organizationId);
    if (existing) return existing;
    const sub = this.repo.create({ organizationId });
    return this.repo.save(sub);
  }

  async updateCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    await this.repo.update(id, { stripeCustomerId });
  }

  async activate(
    organizationId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodEnd: Date | null,
  ): Promise<void> {
    await this.repo.upsert(
      {
        organizationId,
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodEnd,
      },
      ['organizationId'],
    );
  }

  async updateStatus(
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
    currentPeriodEnd?: Date,
  ): Promise<void> {
    const plan =
      status === SubscriptionStatus.ACTIVE
        ? SubscriptionPlan.PRO
        : SubscriptionPlan.FREE;

    await this.repo.update(
      { stripeSubscriptionId },
      { status, plan, ...(currentPeriodEnd && { currentPeriodEnd }) },
    );
  }

  async cancel(stripeSubscriptionId: string): Promise<void> {
    await this.repo.update(
      { stripeSubscriptionId },
      { status: SubscriptionStatus.CANCELLED, plan: SubscriptionPlan.FREE },
    );
  }
}
