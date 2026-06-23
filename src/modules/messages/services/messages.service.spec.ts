/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessagesService } from './messages.service';
import { MessagesRepository } from '../repositories/messages.repository';
import { CreateMessageDto } from '../dto/create-message.dto';
import { Message } from '../entities/message.entity';

const mockMessage = (overrides: Partial<Message> = {}): Message =>
  ({
    id: 'message-uuid',
    organizationId: 'org-uuid',
    authorId: 'author-uuid',
    content: 'hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Message;

describe('MessagesService', () => {
  let service: MessagesService;
  let messagesRepo: jest.Mocked<MessagesRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: MessagesRepository,
          useValue: {
            create: jest.fn(),
            findAllByOrg: jest.fn(),
            findAllByOrgPaginated: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(MessagesService);
    messagesRepo = module.get(MessagesRepository);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('create', () => {
    const dto: CreateMessageDto = { content: 'Kickoff is June 1st.' };

    it('saves the message and emits message.created', async () => {
      const saved = mockMessage({ content: dto.content });
      messagesRepo.create.mockResolvedValue(saved);

      const result = await service.create('org-uuid', 'author-uuid', dto);

      expect(messagesRepo.create).toHaveBeenCalledWith(
        'org-uuid',
        'author-uuid',
        dto.content,
      );
      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'message.created',
        {
          organizationId: 'org-uuid',
          authorId: 'author-uuid',
          content: dto.content,
        },
      );
      expect(result).toBe(saved);
    });
  });
});
