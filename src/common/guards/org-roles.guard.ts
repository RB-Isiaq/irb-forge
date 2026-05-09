import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Membership } from '../../modules/memberships/entities/membership.entity';
import { MembershipRole } from '../../modules/memberships/enums/membership-role.enum';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { slug?: string };
      user: User;
      org: Organization;
      membership: Membership;
    }>();

    const { user, params } = request;
    const slug = params?.slug;

    if (!slug || !user) return true;

    const org = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { slug } });

    if (!org) throw new NotFoundException('Organization not found');

    const membership = await this.dataSource
      .getRepository(Membership)
      .findOne({ where: { userId: user.id, organizationId: org.id } });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    request.org = org;
    request.membership = membership;

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
