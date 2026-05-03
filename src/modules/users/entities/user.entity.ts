import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  password: string | null;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true })
  lastName: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, unique: true })
  googleId: string | null;

  @Column({ nullable: true, select: false })
  refreshToken: string | null;

  @Column({ nullable: true, select: false })
  verificationToken: string | null;

  @Column({ nullable: true, select: false })
  verificationTokenExpiry: Date | null;

  @Column({ nullable: true, select: false })
  passwordResetToken: string | null;

  @Column({ nullable: true, select: false })
  passwordResetExpiry: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
