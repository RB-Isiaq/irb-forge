/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ChannelMessagesListener } from './channel-messages.listener';
import { PushSenderService } from '../services/push-sender.service';
import { Organization } from '../../organizations/entities/organization.entity';
import { ChannelMember } from '../../channels/entities/channel-member.entity';
import { User } from '../../users/entities/user.entity';

const mockOrg = (): Organization =>
  ({
    id: 'org-uuid',
    name: 'Test Org',
    slug: 'test-org',
  }) as Organization;

const mockAuthor = (): User =>
  ({
    id: 'author-uuid',
    email: 'author@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
  }) as User;

const channelMemberWithPushToken = (
  userId: string,
  pushToken: string | null,
): ChannelMember =>
  ({
    userId,
    channelId: 'channel-uuid',
    organizationId: 'org-uuid',
    user: { id: userId, pushToken } as User,
  }) as ChannelMember;

describe('ChannelMessagesListener', () => {
  let listener: ChannelMessagesListener;
  let pushSender: jest.Mocked<PushSenderService>;
  let orgRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock; update: jest.Mock };
  let channelMemberRepo: { find: jest.Mock };
  let dataSource: { getRepository: jest.Mock };

  beforeEach(async () => {
    orgRepo = { findOne: jest.fn().mockResolvedValue(mockOrg()) };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(mockAuthor()),
      update: jest.fn(),
    };
    channelMemberRepo = { find: jest.fn().mockResolvedValue([]) };

    dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Organization) return orgRepo;
        if (entity === User) return userRepo;
        if (entity === ChannelMember) return channelMemberRepo;
        throw new Error('unexpected repository requested');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessagesListener,
        {
          provide: PushSenderService,
          useValue: { send: jest.fn().mockResolvedValue([]) },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    listener = module.get(ChannelMessagesListener);
    pushSender = module.get(PushSenderService);
  });

  const baseEvent = {
    organizationId: 'org-uuid',
    channelId: 'channel-uuid',
    channelName: 'general',
    authorId: 'author-uuid',
    content: 'hello',
  };

  it('does nothing if the org no longer exists', async () => {
    orgRepo.findOne.mockResolvedValue(null);

    await listener.handleChannelMessageCreated(baseEvent);

    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('skips sending when no other channel member has a push token', async () => {
    channelMemberRepo.find.mockResolvedValue([
      channelMemberWithPushToken('author-uuid', 'ExponentPushToken[author]'),
      channelMemberWithPushToken('member-uuid', null),
    ]);

    await listener.handleChannelMessageCreated(baseEvent);

    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('sends a push to channel members excluding the author, with a deep-link url', async () => {
    channelMemberRepo.find.mockResolvedValue([
      channelMemberWithPushToken('author-uuid', 'ExponentPushToken[author]'),
      channelMemberWithPushToken('member-1', 'ExponentPushToken[member1]'),
      channelMemberWithPushToken('member-2', 'ExponentPushToken[member2]'),
    ]);

    await listener.handleChannelMessageCreated({
      ...baseEvent,
      content: 'Kickoff is June 1st.',
    });

    expect(pushSender.send).toHaveBeenCalledWith(
      [
        { userId: 'member-1', token: 'ExponentPushToken[member1]' },
        { userId: 'member-2', token: 'ExponentPushToken[member2]' },
      ],
      '#general in Test Org',
      'Ada Lovelace: Kickoff is June 1st.',
      {
        url: '/channels/channel-uuid',
        orgSlug: 'test-org',
        channelId: 'channel-uuid',
      },
    );
  });

  it('clears push tokens for users whose device is no longer registered', async () => {
    channelMemberRepo.find.mockResolvedValue([
      channelMemberWithPushToken('member-1', 'ExponentPushToken[member1]'),
    ]);
    pushSender.send.mockResolvedValue(['member-1']);

    await listener.handleChannelMessageCreated(baseEvent);

    expect(userRepo.update).toHaveBeenCalledWith(['member-1'], {
      pushToken: null,
    });
  });

  it('swallows errors so a failed push never breaks message creation', async () => {
    channelMemberRepo.find.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleChannelMessageCreated(baseEvent),
    ).resolves.toBeUndefined();
  });
});
