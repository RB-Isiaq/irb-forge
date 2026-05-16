import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { MembershipRole } from '../enums/membership-role.enum';

@Injectable()
export class MembershipsRepository {
  constructor(
    @InjectRepository(Membership)
    private readonly repo: Repository<Membership>,
  ) {}

  findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return this.repo.findOne({ where: { userId, organizationId } });
  }

  findAllByOrg(organizationId: string): Promise<Membership[]> {
    return this.repo.find({
      where: { organizationId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  findAllByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<[Membership[], number]> {
    return this.repo.findAndCount({
      where: { organizationId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findByIdAndOrg(
    id: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  findByUserIdAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return this.repo.findOne({ where: { userId, organizationId } });
  }

  async updateRole(id: string, role: MembershipRole): Promise<void> {
    await this.repo.update(id, { role });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  findAllByUser(userId: string): Promise<Membership[]> {
    return this.repo.find({
      where: { userId },
      relations: ['organization'],
      order: { joinedAt: 'DESC' },
    });
  }
}
