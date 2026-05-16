import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessagesRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
  ) {}

  create(
    organizationId: string,
    authorId: string,
    content: string,
  ): Promise<Message> {
    const message = this.repo.create({ organizationId, authorId, content });
    return this.repo.save(message);
  }

  findAllByOrg(organizationId: string): Promise<Message[]> {
    return this.repo.find({
      where: { organizationId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }
}
