/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { MessagesListener } from './messages.listener';
import { PushSenderService } from '../services/push-sender.service';
import { Organization } from '../../organizations/entities/organization.entity';
import { Membership } from '../../memberships/entities/membership.entity';
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

const membershipWithPushToken = (
  userId: string,
  pushToken: string | null,
): Membership =>
  ({
    userId,
    organizationId: 'org-uuid',
    user: { id: userId, pushToken } as User,
  }) as Membership;

describe('MessagesListener', () => {
  let listener: MessagesListener;
  let pushSender: jest.Mocked<PushSenderService>;
  let orgRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock; update: jest.Mock };
  let membershipRepo: { find: jest.Mock };
  let dataSource: { getRepository: jest.Mock };

  beforeEach(async () => {
    orgRepo = { findOne: jest.fn().mockResolvedValue(mockOrg()) };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(mockAuthor()),
      update: jest.fn(),
    };
    membershipRepo = { find: jest.fn().mockResolvedValue([]) };

    dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Organization) return orgRepo;
        if (entity === User) return userRepo;
        if (entity === Membership) return membershipRepo;
        throw new Error('unexpected repository requested');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesListener,
        {
          provide: PushSenderService,
          useValue: { send: jest.fn().mockResolvedValue([]) },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    listener = module.get(MessagesListener);
    pushSender = module.get(PushSenderService);
  });

  it('does nothing if the org no longer exists', async () => {
    orgRepo.findOne.mockResolvedValue(null);

    await listener.handleMessageCreated({
      organizationId: 'org-uuid',
      authorId: 'author-uuid',
      content: 'hello',
    });

    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('skips sending when no other member has a push token', async () => {
    membershipRepo.find.mockResolvedValue([
      membershipWithPushToken('author-uuid', 'ExponentPushToken[author]'),
      membershipWithPushToken('member-uuid', null),
    ]);

    await listener.handleMessageCreated({
      organizationId: 'org-uuid',
      authorId: 'author-uuid',
      content: 'hello',
    });

    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('sends a push to org members excluding the author, with a deep-link url', async () => {
    membershipRepo.find.mockResolvedValue([
      membershipWithPushToken('author-uuid', 'ExponentPushToken[author]'),
      membershipWithPushToken('member-1', 'ExponentPushToken[member1]'),
      membershipWithPushToken('member-2', 'ExponentPushToken[member2]'),
    ]);

    await listener.handleMessageCreated({
      organizationId: 'org-uuid',
      authorId: 'author-uuid',
      content: 'Kickoff is June 1st.',
    });

    expect(pushSender.send).toHaveBeenCalledWith(
      [
        { userId: 'member-1', token: 'ExponentPushToken[member1]' },
        { userId: 'member-2', token: 'ExponentPushToken[member2]' },
      ],
      'New message in Test Org',
      'Ada Lovelace: Kickoff is June 1st.',
      { url: '/messages', orgSlug: 'test-org' },
    );
  });

  it('truncates long message bodies in the push preview', async () => {
    membershipRepo.find.mockResolvedValue([
      membershipWithPushToken('member-1', 'ExponentPushToken[member1]'),
    ]);
    const longContent = 'x'.repeat(200);

    await listener.handleMessageCreated({
      organizationId: 'org-uuid',
      authorId: 'author-uuid',
      content: longContent,
    });

    const [, , body] = pushSender.send.mock.calls[0];
    expect(body).toBe(`Ada Lovelace: ${'x'.repeat(150)}…`);
  });

  it('clears push tokens for users whose device is no longer registered', async () => {
    membershipRepo.find.mockResolvedValue([
      membershipWithPushToken('member-1', 'ExponentPushToken[member1]'),
    ]);
    pushSender.send.mockResolvedValue(['member-1']);

    await listener.handleMessageCreated({
      organizationId: 'org-uuid',
      authorId: 'author-uuid',
      content: 'hello',
    });

    expect(userRepo.update).toHaveBeenCalledWith(['member-1'], {
      pushToken: null,
    });
  });

  it('swallows errors so a failed push never breaks message creation', async () => {
    membershipRepo.find.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleMessageCreated({
        organizationId: 'org-uuid',
        authorId: 'author-uuid',
        content: 'hello',
      }),
    ).resolves.toBeUndefined();
  });
});
