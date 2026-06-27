import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelMessagesRepository } from '../repositories/channel-messages.repository';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { SendChannelMessageDto } from '../dto/send-channel-message.dto';
import { ChannelMessage } from '../entities/channel-message.entity';

@Injectable()
export class ChannelMessagesService {
  constructor(
    private readonly channelMessagesRepo: ChannelMessagesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    channelId: string,
    channelName: string,
    authorId: string,
    dto: SendChannelMessageDto,
  ): Promise<ChannelMessage> {
    const message = await this.channelMessagesRepo.create(
      channelId,
      authorId,
      dto.content,
    );
    this.eventEmitter.emit('channel-message.created', {
      organizationId,
      channelId,
      channelName,
      authorId,
      content: dto.content,
    });
    return message;
  }

  async listByChannelPaginated(
    channelId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<ChannelMessage>> {
    const [items, total] =
      await this.channelMessagesRepo.findAllByChannelPaginated(
        channelId,
        page,
        limit,
      );
    return new PaginatedResponseDto(items, total, page, limit);
  }
}
