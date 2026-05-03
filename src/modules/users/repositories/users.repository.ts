import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByEmailForAuth(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByIdForAuth(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  async linkGoogleId(id: string, googleId: string): Promise<void> {
    await this.repo.update(id, { googleId, isVerified: true });
  }

  findByIdForRefresh(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  findByVerificationToken(tokenHash: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.verificationToken')
      .addSelect('user.verificationTokenExpiry')
      .where('user.verificationToken = :tokenHash', { tokenHash })
      .getOne();
  }

  async setVerificationToken(
    id: string,
    tokenHash: string,
    expiry: Date,
  ): Promise<void> {
    await this.repo.update(id, {
      verificationToken: tokenHash,
      verificationTokenExpiry: expiry,
    });
  }

  async markAsVerified(id: string): Promise<void> {
    await this.repo.update(id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    });
  }

  findByResetToken(tokenHash: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordResetToken')
      .addSelect('user.passwordResetExpiry')
      .where('user.passwordResetToken = :tokenHash', { tokenHash })
      .andWhere('user.passwordResetExpiry > :now', { now: new Date() })
      .getOne();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async updateRefreshToken(id: string, hash: string | null): Promise<void> {
    await this.repo.update(id, { refreshToken: hash });
  }

  async setPasswordReset(
    id: string,
    tokenHash: string,
    expiry: Date,
  ): Promise<void> {
    await this.repo.update(id, {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    });
  }

  async clearPasswordReset(id: string): Promise<void> {
    await this.repo.update(id, {
      passwordResetToken: null,
      passwordResetExpiry: null,
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.repo.update(id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    });
  }
}
