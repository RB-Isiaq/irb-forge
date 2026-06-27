/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelMessagesService } from './channel-messages.service';
import { ChannelMessagesRepository } from '../repositories/channel-messages.repository';
import { ChannelMessage } from '../entities/channel-message.entity';

const mockMessage = (overrides: Partial<ChannelMessage> = {}): ChannelMessage =>
  ({
    id: 'message-uuid',
    channelId: 'channel-uuid',
    authorId: 'author-uuid',
    content: 'hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ChannelMessage;

describe('ChannelMessagesService', () => {
  let service: ChannelMessagesService;
  let channelMessagesRepo: jest.Mocked<ChannelMessagesRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessagesService,
        {
          provide: ChannelMessagesRepository,
          useValue: {
            create: jest.fn(),
            findPageByChannel: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(ChannelMessagesService);
    channelMessagesRepo = module.get(ChannelMessagesRepository);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('create', () => {
    const dto = { content: 'Welcome to the channel!' };

    it('saves the message and emits channel-message.created', async () => {
      const saved = mockMessage({ content: dto.content });
      channelMessagesRepo.create.mockResolvedValue(saved);

      const result = await service.create(
        'org-uuid',
        'channel-uuid',
        'general',
        'author-uuid',
        dto,
      );

      expect(channelMessagesRepo.create).toHaveBeenCalledWith(
        'channel-uuid',
        'author-uuid',
        dto.content,
      );
      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'channel-message.created',
        {
          organizationId: 'org-uuid',
          channelId: 'channel-uuid',
          channelName: 'general',
          authorId: 'author-uuid',
          content: dto.content,
        },
      );
      expect(result).toBe(saved);
    });
  });

  describe('listByChannel', () => {
    it('returns a null cursor when fewer rows than the limit come back', async () => {
      const items = [mockMessage()];
      channelMessagesRepo.findPageByChannel.mockResolvedValue(items);

      const result = await service.listByChannel('channel-uuid', undefined, 20);

      expect(channelMessagesRepo.findPageByChannel).toHaveBeenCalledWith(
        'channel-uuid',
        undefined,
        20,
      );
      expect(result).toEqual({ items, nextCursor: null });
    });

    it('trims the extra row and returns its createdAt as nextCursor when more remain', async () => {
      const older = mockMessage({
        id: 'older',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const newer = mockMessage({
        id: 'newer',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      // Repo fetches limit + 1 (here limit=1) — a 2nd row signals more history exists.
      channelMessagesRepo.findPageByChannel.mockResolvedValue([newer, older]);

      const result = await service.listByChannel('channel-uuid', undefined, 1);

      // limit=1 keeps only `newer`; its own createdAt is the cursor to
      // continue from on the next request (not the trimmed extra row's).
      expect(result).toEqual({
        items: [newer],
        nextCursor: '2026-01-02T00:00:00.000Z',
      });
    });

    it('converts the before string to a Date for the repository call', async () => {
      channelMessagesRepo.findPageByChannel.mockResolvedValue([]);

      await service.listByChannel(
        'channel-uuid',
        '2026-01-01T00:00:00.000Z',
        20,
      );

      expect(channelMessagesRepo.findPageByChannel).toHaveBeenCalledWith(
        'channel-uuid',
        new Date('2026-01-01T00:00:00.000Z'),
        20,
      );
    });
  });
});
