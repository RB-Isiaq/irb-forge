import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessagesRepository } from '../repositories/messages.repository';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepo: MessagesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    authorId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    const message = await this.messagesRepo.create(
      organizationId,
      authorId,
      dto.content,
    );
    this.eventEmitter.emit('message.created', {
      organizationId,
      authorId,
      content: dto.content,
    });
    return message;
  }

  listByOrg(organizationId: string): Promise<Message[]> {
    return this.messagesRepo.findAllByOrg(organizationId);
  }

  async listByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<Message>> {
    const [items, total] = await this.messagesRepo.findAllByOrgPaginated(
      organizationId,
      page,
      limit,
    );
    return new PaginatedResponseDto(items, total, page, limit);
  }
}
