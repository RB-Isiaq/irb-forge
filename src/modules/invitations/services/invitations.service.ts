import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { Invitation } from '../entities/invitation.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';
import { Membership } from '../../memberships/entities/membership.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationPreviewDto } from '../dto/invitation-preview.dto';

const INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationsRepo: InvitationsRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async invite(
    org: Organization,
    invitedBy: User,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    if (dto.email === invitedBy.email) {
      throw new ConflictException('You cannot invite yourself');
    }

    const existing = await this.invitationsRepo.findPendingByEmailAndOrg(
      dto.email,
      org.id,
    );
    if (existing) {
      throw new ConflictException(
        'A pending invitation already exists for this email',
      );
    }

    const existingMembership = await this.dataSource
      .getRepository(Membership)
      .createQueryBuilder('m')
      .innerJoin('m.user', 'u')
      .where('m.organizationId = :orgId', { orgId: org.id })
      .andWhere('u.email = :email', { email: dto.email })
      .getOne();
    if (existingMembership) {
      throw new ConflictException('This user is already a member');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = await this.invitationsRepo.create({
      organizationId: org.id,
      invitedByUserId: invitedBy.id,
      email: dto.email,
      role: dto.role ?? MembershipRole.MEMBER,
      token: tokenHash,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    this.eventEmitter.emit('invitation.created', {
      email: dto.email,
      orgName: org.name,
      inviterName: invitedBy.firstName ?? invitedBy.email,
      role: invitation.role,
      rawToken,
    });

    return invitation;
  }

  findPendingByOrg(organizationId: string): Promise<Invitation[]> {
    return this.invitationsRepo.findPendingByOrg(organizationId);
  }

  async cancel(org: Organization, invitationId: string): Promise<void> {
    const invitation = await this.invitationsRepo.findByIdAndOrg(
      invitationId,
      org.id,
    );
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Invitation is no longer pending');
    }

    await this.invitationsRepo.updateStatus(
      invitation.id,
      InvitationStatus.EXPIRED,
    );
  }

  async accept(user: User, rawToken: string): Promise<void> {
    if (!user.isVerified) {
      throw new ForbiddenException(
        'Email must be verified before accepting an invitation',
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const invitation = await this.invitationsRepo.findPendingByToken(tokenHash);
    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    const alreadyMember = await this.dataSource
      .getRepository(Membership)
      .findOne({
        where: { userId: user.id, organizationId: invitation.organizationId },
      });
    if (alreadyMember) {
      throw new ConflictException(
        'You are already a member of this organization',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(Membership, {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        }),
      );
      await manager.update(Invitation, invitation.id, {
        status: InvitationStatus.ACCEPTED,
      });
    });
  }

  async preview(rawToken: string): Promise<InvitationPreviewDto> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const invitation = await this.invitationsRepo.findPreviewByToken(tokenHash);
    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    return {
      organization: {
        name: (invitation.organization as { name: string }).name,
        slug: (invitation.organization as { slug: string }).slug,
        description: (invitation.organization as { description: string | null })
          .description,
      },
      invitedBy: {
        firstName: (invitation.invitedBy as { firstName: string | null })
          .firstName,
        lastName: (invitation.invitedBy as { lastName: string | null })
          .lastName,
      },
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async findMyInvitations(userEmail: string): Promise<Invitation[]> {
    return this.invitationsRepo.findPendingByEmail(userEmail);
  }

  async acceptById(user: User, invitationId: string): Promise<void> {
    if (!user.isVerified) {
      throw new ForbiddenException(
        'Email must be verified before accepting an invitation',
      );
    }

    const invitation = await this.invitationsRepo.findPendingById(invitationId);
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new NotFoundException('Invitation not found or has expired');
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    const alreadyMember = await this.dataSource
      .getRepository(Membership)
      .findOne({
        where: { userId: user.id, organizationId: invitation.organizationId },
      });
    if (alreadyMember) {
      throw new ConflictException(
        'You are already a member of this organization',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(Membership, {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        }),
      );
      await manager.update(Invitation, invitation.id, {
        status: InvitationStatus.ACCEPTED,
      });
    });
  }

  async declineById(user: User, invitationId: string): Promise<void> {
    const invitation = await this.invitationsRepo.findPendingById(invitationId);
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new NotFoundException('Invitation not found or has expired');
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    await this.invitationsRepo.updateStatus(
      invitation.id,
      InvitationStatus.DECLINED,
    );
  }

  async resend(
    org: Organization,
    invitationId: string,
    invitedBy: User,
  ): Promise<void> {
    const invitation = await this.invitationsRepo.findByIdAndOrg(
      invitationId,
      org.id,
    );
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be resent');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    await this.invitationsRepo.refreshToken(
      invitation.id,
      tokenHash,
      expiresAt,
    );

    this.eventEmitter.emit('invitation.created', {
      email: invitation.email,
      orgName: org.name,
      inviterName: invitedBy.firstName ?? invitedBy.email,
      role: invitation.role,
      rawToken,
    });
  }

  async decline(user: User, rawToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const invitation = await this.invitationsRepo.findPendingByToken(tokenHash);
    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    await this.invitationsRepo.updateStatus(
      invitation.id,
      InvitationStatus.DECLINED,
    );
  }
}
