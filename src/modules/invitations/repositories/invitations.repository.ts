import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from '../entities/invitation.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
  ) {}

  create(data: Partial<Invitation>): Promise<Invitation> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<Invitation | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdAndOrg(
    id: string,
    organizationId: string,
  ): Promise<Invitation | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  findPendingByOrg(organizationId: string): Promise<Invitation[]> {
    return this.repo.find({
      where: { organizationId, status: InvitationStatus.PENDING },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  findPendingById(id: string): Promise<Invitation | null> {
    return this.repo.findOne({
      where: { id, status: InvitationStatus.PENDING },
    });
  }

  findPendingByToken(tokenHash: string): Promise<Invitation | null> {
    return this.repo
      .createQueryBuilder('invitation')
      .addSelect('invitation.token')
      .where('invitation.token = :tokenHash', { tokenHash })
      .andWhere('invitation.status = :status', {
        status: InvitationStatus.PENDING,
      })
      .andWhere('invitation.expiresAt > :now', { now: new Date() })
      .getOne();
  }

  findPendingByEmailAndOrg(
    email: string,
    organizationId: string,
  ): Promise<Invitation | null> {
    return this.repo.findOne({
      where: { email, organizationId, status: InvitationStatus.PENDING },
    });
  }

  async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async refreshToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.repo.update(id, { token: tokenHash, expiresAt });
  }

  findPreviewByToken(tokenHash: string): Promise<Invitation | null> {
    return this.repo
      .createQueryBuilder('invitation')
      .addSelect('invitation.token')
      .leftJoinAndSelect('invitation.organization', 'organization')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .where('invitation.token = :tokenHash', { tokenHash })
      .andWhere('invitation.status = :status', {
        status: InvitationStatus.PENDING,
      })
      .andWhere('invitation.expiresAt > :now', { now: new Date() })
      .getOne();
  }

  findPendingByEmail(email: string): Promise<Invitation[]> {
    return this.repo.find({
      where: { email, status: InvitationStatus.PENDING },
      relations: ['organization', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async expireStale(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Invitation)
      .set({ status: InvitationStatus.EXPIRED })
      .where('status = :status', { status: InvitationStatus.PENDING })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
