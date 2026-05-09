import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { Membership } from '../entities/membership.entity';
import { MembershipRole } from '../enums/membership-role.enum';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Organization } from '../../organizations/entities/organization.entity';

@Injectable()
export class MembershipsService {
  constructor(private readonly membershipsRepo: MembershipsRepository) {}

  findAllByOrg(organizationId: string): Promise<Membership[]> {
    return this.membershipsRepo.findAllByOrg(organizationId);
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
  }
}
