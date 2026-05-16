import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ nullable: true, unique: true })
  stripeEventId: string | null;

  @Column({ type: 'int' })
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
