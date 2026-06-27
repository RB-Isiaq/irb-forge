/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsRepository } from '../repositories/channels.repository';
import { ChannelMembersRepository } from '../repositories/channel-members.repository';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { SubscriptionPlan } from '../../subscriptions/enums/subscription-plan.enum';
import { SubscriptionStatus } from '../../subscriptions/enums/subscription-status.enum';
import { MembershipsRepository } from '../../memberships/repositories/memberships.repository';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Channel } from '../entities/channel.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Membership } from '../../memberships/entities/membership.entity';

const mockChannel = (overrides: Partial<Channel> = {}): Channel =>
  ({
    id: 'channel-uuid',
    organizationId: 'org-uuid',
    name: 'general',
    isDefault: false,
    createdById: 'creator-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Channel;

const mockSubscription = (plan: SubscriptionPlan): Subscription =>
  ({
    id: 'sub-uuid',
    organizationId: 'org-uuid',
    plan,
    status: SubscriptionStatus.ACTIVE,
  }) as Subscription;

describe('ChannelsService', () => {
  let service: ChannelsService;
  let channelsRepo: jest.Mocked<ChannelsRepository>;
  let channelMembersRepo: jest.Mocked<ChannelMembersRepository>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let membershipsRepo: jest.Mocked<MembershipsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: ChannelsRepository,
          useValue: {
            findByOrgAndName: jest.fn(),
            countByOrg: jest.fn(),
            create: jest.fn(),
            findMineByOrg: jest.fn(),
            findByOrgAndId: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ChannelMembersRepository,
          useValue: {
            add: jest.fn(),
            findOne: jest.fn(),
            findAllByChannel: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: { getByOrg: jest.fn() },
        },
        {
          provide: MembershipsRepository,
          useValue: { findByUserAndOrg: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ChannelsService);
    channelsRepo = module.get(ChannelsRepository);
    channelMembersRepo = module.get(ChannelMembersRepository);
    subscriptionsService = module.get(SubscriptionsService);
    membershipsRepo = module.get(MembershipsRepository);
  });

  describe('create', () => {
    it('throws ConflictException if a channel with this name already exists', async () => {
      channelsRepo.findByOrgAndName.mockResolvedValue(mockChannel());

      await expect(
        service.create('org-uuid', 'user-uuid', { name: 'general' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when free plan is already at the channel limit', async () => {
      channelsRepo.findByOrgAndName.mockResolvedValue(null);
      subscriptionsService.getByOrg.mockResolvedValue(
        mockSubscription(SubscriptionPlan.FREE),
      );
      channelsRepo.countByOrg.mockResolvedValue(1);

      await expect(
        service.create('org-uuid', 'user-uuid', { name: 'cohort' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows creation on free plan when under the limit', async () => {
      channelsRepo.findByOrgAndName.mockResolvedValue(null);
      subscriptionsService.getByOrg.mockResolvedValue(
        mockSubscription(SubscriptionPlan.FREE),
      );
      channelsRepo.countByOrg.mockResolvedValue(0);
      const created = mockChannel();
      channelsRepo.create.mockResolvedValue(created);

      const result = await service.create('org-uuid', 'user-uuid', {
        name: 'general',
      });

      expect(result).toBe(created);
      expect(channelMembersRepo.add).toHaveBeenCalledWith(
        created.id,
        'org-uuid',
        'user-uuid',
      );
    });

    it('ignores the channel limit on a pro plan', async () => {
      channelsRepo.findByOrgAndName.mockResolvedValue(null);
      subscriptionsService.getByOrg.mockResolvedValue(
        mockSubscription(SubscriptionPlan.PRO),
      );
      channelsRepo.create.mockResolvedValue(mockChannel());

      await service.create('org-uuid', 'user-uuid', { name: 'cohort-2026' });

      expect(channelsRepo.countByOrg).not.toHaveBeenCalled();
      expect(channelsRepo.create).toHaveBeenCalled();
    });
  });

  describe('listMine', () => {
    it('delegates to the repository', async () => {
      const channels = [mockChannel()];
      channelsRepo.findMineByOrg.mockResolvedValue(channels);

      const result = await service.listMine('org-uuid', 'user-uuid');

      expect(result).toBe(channels);
      expect(channelsRepo.findMineByOrg).toHaveBeenCalledWith(
        'org-uuid',
        'user-uuid',
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException if the channel does not exist', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(null);

      await expect(service.delete('org-uuid', 'channel-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for the default channel', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ isDefault: true }),
      );

      await expect(service.delete('org-uuid', 'channel-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes a non-default channel', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(mockChannel());

      await service.delete('org-uuid', 'channel-uuid');

      expect(channelsRepo.delete).toHaveBeenCalledWith('channel-uuid');
    });
  });

  describe('listMembers', () => {
    it('throws ForbiddenException if requester is neither creator nor owner/admin', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ createdById: 'someone-else' }),
      );

      await expect(
        service.listMembers(
          'org-uuid',
          'channel-uuid',
          'requester-uuid',
          MembershipRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns channel members for the creator', async () => {
      const channel = mockChannel({ createdById: 'requester-uuid' });
      channelsRepo.findByOrgAndId.mockResolvedValue(channel);
      const members = [{ id: 'member-1' }] as never;
      channelMembersRepo.findAllByChannel.mockResolvedValue(members);

      const result = await service.listMembers(
        'org-uuid',
        'channel-uuid',
        'requester-uuid',
        MembershipRole.MEMBER,
      );

      expect(result).toBe(members);
      expect(channelMembersRepo.findAllByChannel).toHaveBeenCalledWith(
        channel.id,
      );
    });

    it('returns channel members for an org admin even if not the creator', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ createdById: 'someone-else' }),
      );
      channelMembersRepo.findAllByChannel.mockResolvedValue([] as never);

      await expect(
        service.listMembers(
          'org-uuid',
          'channel-uuid',
          'admin-uuid',
          MembershipRole.ADMIN,
        ),
      ).resolves.toEqual([]);
    });
  });

  describe('addMember', () => {
    it('throws ForbiddenException if requester is neither creator nor owner/admin', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ createdById: 'someone-else' }),
      );

      await expect(
        service.addMember(
          'org-uuid',
          'channel-uuid',
          'requester-uuid',
          MembershipRole.MEMBER,
          'target-uuid',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if target is not an org member', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ createdById: 'requester-uuid' }),
      );
      membershipsRepo.findByUserAndOrg.mockResolvedValue(null);

      await expect(
        service.addMember(
          'org-uuid',
          'channel-uuid',
          'requester-uuid',
          MembershipRole.MEMBER,
          'target-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if target is already a channel member', async () => {
      const channel = mockChannel({ createdById: 'requester-uuid' });
      channelsRepo.findByOrgAndId.mockResolvedValue(channel);
      membershipsRepo.findByUserAndOrg.mockResolvedValue({} as Membership);
      channelMembersRepo.findOne.mockResolvedValue({
        id: 'existing',
      } as never);

      await expect(
        service.addMember(
          'org-uuid',
          'channel-uuid',
          'requester-uuid',
          MembershipRole.MEMBER,
          'target-uuid',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('adds the member when requester is an org admin', async () => {
      const channel = mockChannel({ createdById: 'someone-else' });
      channelsRepo.findByOrgAndId.mockResolvedValue(channel);
      membershipsRepo.findByUserAndOrg.mockResolvedValue({} as Membership);
      channelMembersRepo.findOne.mockResolvedValue(null);

      await service.addMember(
        'org-uuid',
        'channel-uuid',
        'admin-uuid',
        MembershipRole.ADMIN,
        'target-uuid',
      );

      expect(channelMembersRepo.add).toHaveBeenCalledWith(
        channel.id,
        'org-uuid',
        'target-uuid',
      );
    });
  });

  describe('removeMember', () => {
    it('throws ForbiddenException for the default channel', async () => {
      channelsRepo.findByOrgAndId.mockResolvedValue(
        mockChannel({ isDefault: true }),
      );

      await expect(
        service.removeMember(
          'org-uuid',
          'channel-uuid',
          'admin-uuid',
          MembershipRole.ADMIN,
          'target-uuid',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('removes the member from a non-default channel', async () => {
      const channel = mockChannel({ createdById: 'admin-uuid' });
      channelsRepo.findByOrgAndId.mockResolvedValue(channel);

      await service.removeMember(
        'org-uuid',
        'channel-uuid',
        'admin-uuid',
        MembershipRole.OWNER,
        'target-uuid',
      );

      expect(channelMembersRepo.remove).toHaveBeenCalledWith(
        channel.id,
        'target-uuid',
      );
    });
  });
});
