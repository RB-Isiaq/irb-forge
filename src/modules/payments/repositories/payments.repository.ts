import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  findByOrg(organizationId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  findByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<[Payment[], number]> {
    return this.repo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findByEventId(stripeEventId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { stripeEventId } });
  }

  record(data: {
    organizationId: string;
    stripePaymentIntentId: string | null;
    stripeEventId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  }): Promise<Payment> {
    const payment = this.repo.create(data);
    return this.repo.save(payment);
  }
}
