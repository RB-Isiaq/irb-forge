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
            findAllByChannelPaginated: jest.fn(),
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

  describe('listByChannelPaginated', () => {
    it('wraps repository results in a paginated response', async () => {
      const items = [mockMessage()];
      channelMessagesRepo.findAllByChannelPaginated.mockResolvedValue([
        items,
        1,
      ]);

      const result = await service.listByChannelPaginated(
        'channel-uuid',
        1,
        20,
      );

      expect(result).toEqual({
        items,
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });
    });
  });
});
