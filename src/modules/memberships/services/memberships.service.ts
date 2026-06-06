import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { RedisService } from '../../../common/redis/redis.service';
import { Membership } from '../entities/membership.entity';
import { MembershipRole } from '../enums/membership-role.enum';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Organization } from '../../organizations/entities/organization.entity';

const MEMBERS_CACHE_TTL = 30;

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly membershipsRepo: MembershipsRepository,
    private readonly redisService: RedisService,
  ) {}

  private membersCacheKey(orgId: string) {
    return `cache:members:${orgId}`;
  }

  async invalidateMembersCache(organizationId: string): Promise<void> {
    await this.redisService.del(this.membersCacheKey(organizationId));
  }

  findAllByOrg(organizationId: string): Promise<Membership[]> {
    return this.membershipsRepo.findAllByOrg(organizationId);
  }

  async findAllByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<Membership>> {
    // Only cache the first page at default limit (most common request)
    const isDefaultRequest = page === 1 && limit === 20;
    const cacheKey = this.membersCacheKey(organizationId);

    if (isDefaultRequest) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached) as PaginatedResponseDto<Membership>;
    }

    const [items, total] = await this.membershipsRepo.findAllByOrgPaginated(
      organizationId,
      page,
      limit,
    );
    const result = new PaginatedResponseDto(items, total, page, limit);

    if (isDefaultRequest) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        MEMBERS_CACHE_TTL,
      );
    }

    return result;
  }

  async updateRole(
    org: Organization,
    targetUserId: string,
    actorMembership: Membership,
    dto: UpdateRoleDto,
  ): Promise<Membership> {
    const target = await this.membershipsRepo.findByUserIdAndOrg(
      targetUserId,
      org.id,
    );
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Cannot change the role of the org owner');
    }
    if (target.userId === actorMembership.userId) {
      throw new BadRequestException('Cannot change your own role');
    }

    await this.membershipsRepo.updateRole(target.id, dto.role);
    await this.invalidateMembersCache(org.id);
    this.logger.log(
      `Role updated: user ${targetUserId} → ${dto.role} in org ${org.slug}`,
    );
    return { ...target, role: dto.role };
  }

  async removeMember(
    org: Organization,
    targetUserId: string,
    actorMembership: Membership,
  ): Promise<void> {
    const target = await this.membershipsRepo.findByUserIdAndOrg(
      targetUserId,
      org.id,
    );
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === MembershipRole.OWNER) {
      throw new ForbiddenException('Cannot remove the org owner');
    }
    if (target.userId === actorMembership.userId) {
      throw new BadRequestException(
        'Use the leave endpoint to remove yourself',
      );
    }

    await this.membershipsRepo.delete(target.id);
    await this.invalidateMembersCache(org.id);
    this.logger.warn(
      `Member removed: user ${targetUserId} from org ${org.slug}`,
    );
  }

  async leave(org: Organization, userId: string): Promise<void> {
    const membership = await this.membershipsRepo.findByUserIdAndOrg(
      userId,
      org.id,
    );
    if (!membership) throw new NotFoundException('You are not a member');
    if (membership.role === MembershipRole.OWNER) {
      throw new ForbiddenException(
        'Owner cannot leave. Transfer ownership or delete the organization.',
      );
    }

    await this.membershipsRepo.delete(membership.id);
    await this.invalidateMembersCache(org.id);
    this.logger.log(`User ${userId} left org ${org.slug}`);
  }
}
