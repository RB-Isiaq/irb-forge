import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChannelMessage } from '../entities/channel-message.entity';

@Injectable()
export class ChannelMessagesRepository {
  constructor(
    @InjectRepository(ChannelMessage)
    private readonly repo: Repository<ChannelMessage>,
  ) {}

  create(
    channelId: string,
    authorId: string,
    content: string,
  ): Promise<ChannelMessage> {
    const message = this.repo.create({ channelId, authorId, content });
    return this.repo.save(message);
  }

  /**
   * Cursor-based, not offset — offset pagination silently skips/duplicates
   * messages on a feed that keeps getting new rows inserted at the head
   * (every client here polls every 5s). Fetches `limit + 1` so the caller
   * can tell whether there's a further page without a separate count query.
   */
  findPageByChannel(
    channelId: string,
    before: Date | undefined,
    limit: number,
  ): Promise<ChannelMessage[]> {
    return this.repo.find({
      where: {
        channelId,
        ...(before && { createdAt: LessThan(before) }),
      },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit + 1,
    });
  }
}
