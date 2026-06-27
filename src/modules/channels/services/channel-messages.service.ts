import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelMessagesRepository } from '../repositories/channel-messages.repository';
import { CursorPaginatedResponseDto } from '../../../common/dto/cursor-paginated-response.dto';
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

  async listByChannel(
    channelId: string,
    before: string | undefined,
    limit: number,
  ): Promise<CursorPaginatedResponseDto<ChannelMessage>> {
    const rows = await this.channelMessagesRepo.findPageByChannel(
      channelId,
      before ? new Date(before) : undefined,
      limit,
    );
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;
    return new CursorPaginatedResponseDto(items, nextCursor);
  }
}
