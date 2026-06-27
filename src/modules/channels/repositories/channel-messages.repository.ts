import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  findAllByChannelPaginated(
    channelId: string,
    page: number,
    limit: number,
  ): Promise<[ChannelMessage[], number]> {
    return this.repo.findAndCount({
      where: { channelId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
