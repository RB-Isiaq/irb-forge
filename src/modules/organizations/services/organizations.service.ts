import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrganizationsRepository } from '../repositories/organizations.repository';
import { Organization } from '../entities/organization.entity';
import { Membership } from '../../memberships/entities/membership.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { UsersService } from '../../users/services/users.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly orgsRepo: OrganizationsRepository,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const user = await this.usersService.findById(userId);
    if (!user.isVerified) {
      throw new ForbiddenException(
        'Email must be verified before creating an organization',
      );
    }

    const slug = dto.slug ?? (await this.orgsRepo.generateUniqueSlug(dto.name));

    if (dto.slug) {
      const taken = await this.orgsRepo.findBySlug(dto.slug);
      if (taken) throw new ConflictException('Slug is already taken');
    }

    return this.dataSource.transaction(async (manager) => {
      const org = await manager.save(
        manager.create(Organization, {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          ownerId: userId,
        }),
      );

      await manager.save(
        manager.create(Membership, {
          userId,
          organizationId: org.id,
          role: MembershipRole.OWNER,
        }),
      );

      return org;
    });
  }

  async findMyOrgs(userId: string): Promise<Organization[]> {
    const memberships = await this.dataSource
      .getRepository(Membership)
      .find({ where: { userId }, relations: ['organization'] });

    return memberships.map((m) => m.organization);
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.orgsRepo.findBySlug(slug);
  }

  async update(
    org: Organization,
    userId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    if (dto.slug !== undefined && dto.slug !== org.slug) {
      if (org.ownerId !== userId) {
        throw new ForbiddenException(
          'Only the owner can change the organization slug',
        );
      }
      const taken = await this.orgsRepo.findBySlug(dto.slug);
      if (taken) throw new ConflictException('Slug is already taken');
    }

    const updates: Partial<Organization> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.slug !== undefined) updates.slug = dto.slug;
    if (dto.description !== undefined)
      updates.description = dto.description ?? null;

    return this.orgsRepo.update(org.id, updates);
  }

  async delete(org: Organization, userId: string): Promise<void> {
    if (org.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the owner can delete this organization',
      );
    }
    await this.orgsRepo.delete(org.id);
  }

  async getOrThrow(slug: string): Promise<Organization> {
    const org = await this.orgsRepo.findBySlug(slug);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
