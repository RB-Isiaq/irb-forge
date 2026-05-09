/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { Invitation } from '../entities/invitation.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

const mockInvitation = (overrides: Partial<Invitation> = {}): Invitation =>
  ({
    id: 'inv-uuid',
    organizationId: 'org-uuid',
    invitedByUserId: 'inviter-uuid',
    email: 'invitee@example.com',
    role: MembershipRole.MEMBER,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    token: 'hashed-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Invitation;

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid',
    email: 'invitee@example.com',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    googleId: null,
    ...overrides,
  }) as User;

const mockOrg = (): Organization =>
  ({
    id: 'org-uuid',
    name: 'Test Org',
    slug: 'test-org',
    description: null,
    ownerId: 'owner-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as Organization;

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationsRepo: jest.Mocked<InvitationsRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    const mockMembershipRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // not a member by default
      }),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockMembershipRepo),
      transaction: jest
        .fn()
        .mockImplementation(
          (
            cb: (m: {
              save: jest.Mock;
              create: jest.Mock;
              update: jest.Mock;
            }) => Promise<void>,
          ) => {
            const manager = {
              save: jest.fn().mockResolvedValue({}),
              create: jest.fn().mockReturnValue({}),
              update: jest.fn().mockResolvedValue({}),
            };
            return cb(manager);
          },
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: InvitationsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findPendingById: jest.fn(),
            findByIdAndOrg: jest.fn(),
            findPendingByToken: jest.fn(),
            findPendingByEmailAndOrg: jest.fn(),
            findPendingByOrg: jest.fn(),
            findPendingByEmail: jest.fn(),
            findPreviewByToken: jest.fn(),
            updateStatus: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(InvitationsService);
    invitationsRepo = module.get(InvitationsRepository);
    eventEmitter = module.get(EventEmitter2);
  });

  // ─── invite ───────────────────────────────────────────────────────────────

  describe('invite', () => {
    const inviter = mockUser({ id: 'inviter-uuid', email: 'inviter@org.com' });
    const dto: CreateInvitationDto = {
      email: 'newcomer@example.com',
      role: MembershipRole.MEMBER,
    };

    it('creates invitation and emits event', async () => {
      invitationsRepo.findPendingByEmailAndOrg.mockResolvedValue(null);
      invitationsRepo.create.mockResolvedValue(mockInvitation());

      await service.invite(mockOrg(), inviter, dto);

      expect(invitationsRepo.create).toHaveBeenCalled();

      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'invitation.created',
        expect.objectContaining({ email: dto.email }),
      );
    });

    it('throws ConflictException if inviting yourself', async () => {
      const self = mockUser({ email: dto.email });
      await expect(service.invite(mockOrg(), self, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException if pending invitation already exists', async () => {
      invitationsRepo.findPendingByEmailAndOrg.mockResolvedValue(
        mockInvitation(),
      );
      await expect(service.invite(mockOrg(), inviter, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException if email is already a member', async () => {
      invitationsRepo.findPendingByEmailAndOrg.mockResolvedValue(null);
      dataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ id: 'existing-membership' }),
        }),
      });
      await expect(service.invite(mockOrg(), inviter, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── acceptById ──────────────────────────────────────────────────────────

  describe('acceptById', () => {
    it('creates membership and marks invitation accepted', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(mockInvitation());
      await service.acceptById(mockUser(), 'inv-uuid');
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('throws ForbiddenException if user is not verified', async () => {
      const unverified = mockUser({ isVerified: false });
      await expect(service.acceptById(unverified, 'inv-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if invitation not found or expired', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(null);
      await expect(service.acceptById(mockUser(), 'inv-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if invitation is past its expiresAt', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(
        mockInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.acceptById(mockUser(), 'inv-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if invitation email does not match user', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(mockInvitation());
      const wrongUser = mockUser({ email: 'someone-else@example.com' });
      await expect(service.acceptById(wrongUser, 'inv-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException if user is already a member', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(mockInvitation());
      dataSource.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'existing-membership' }),
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      });
      await expect(service.acceptById(mockUser(), 'inv-uuid')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── declineById ─────────────────────────────────────────────────────────

  describe('declineById', () => {
    it('updates invitation status to declined', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(mockInvitation());
      invitationsRepo.updateStatus.mockResolvedValue();

      await service.declineById(mockUser(), 'inv-uuid');

      expect(invitationsRepo.updateStatus).toHaveBeenCalledWith(
        'inv-uuid',
        InvitationStatus.DECLINED,
      );
    });

    it('throws NotFoundException if invitation not found', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(null);
      await expect(service.declineById(mockUser(), 'inv-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if email does not match', async () => {
      invitationsRepo.findPendingById.mockResolvedValue(mockInvitation());
      const wrongUser = mockUser({ email: 'other@example.com' });
      await expect(service.declineById(wrongUser, 'inv-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── resend ───────────────────────────────────────────────────────────────

  describe('resend', () => {
    const inviter = mockUser({ id: 'inviter-uuid', firstName: 'Admin' });

    it('regenerates token, resets expiry, and re-emits event', async () => {
      invitationsRepo.findByIdAndOrg.mockResolvedValue(mockInvitation());
      invitationsRepo.refreshToken.mockResolvedValue();

      await service.resend(mockOrg(), 'inv-uuid', inviter);

      expect(invitationsRepo.refreshToken).toHaveBeenCalledWith(
        'inv-uuid',
        expect.any(String),
        expect.any(Date),
      );

      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'invitation.created',
        expect.objectContaining({ email: 'invitee@example.com' }),
      );
    });

    it('throws NotFoundException if invitation not in this org', async () => {
      invitationsRepo.findByIdAndOrg.mockResolvedValue(null);
      await expect(
        service.resend(mockOrg(), 'inv-uuid', inviter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if invitation is not pending', async () => {
      invitationsRepo.findByIdAndOrg.mockResolvedValue(
        mockInvitation({ status: InvitationStatus.ACCEPTED }),
      );
      await expect(
        service.resend(mockOrg(), 'inv-uuid', inviter),
      ).rejects.toThrow(ConflictException);
    });
  });
});
