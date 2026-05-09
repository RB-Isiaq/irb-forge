import { Injectable } from '@nestjs/common';
import { MessagesRepository } from '../repositories/messages.repository';
import { CreateMessageDto } from '../dto/create-message.dto';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepo: MessagesRepository) {}

  create(
    organizationId: string,
    authorId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    return this.messagesRepo.create(organizationId, authorId, dto.content);
  }

  listByOrg(organizationId: string): Promise<Message[]> {
    return this.messagesRepo.findAllByOrg(organizationId);
  }
}
