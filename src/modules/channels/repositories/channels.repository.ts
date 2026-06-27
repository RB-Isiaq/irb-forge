import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { ChannelMember } from '../entities/channel-member.entity';

@Injectable()
export class ChannelsRepository {
  constructor(
    @InjectRepository(Channel)
    private readonly repo: Repository<Channel>,
  ) {}

  create(
    organizationId: string,
    name: string,
    createdById: string,
  ): Promise<Channel> {
    const channel = this.repo.create({ organizationId, name, createdById });
    return this.repo.save(channel);
  }

  findByOrgAndId(organizationId: string, id: string): Promise<Channel | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  findByOrgAndName(
    organizationId: string,
    name: string,
  ): Promise<Channel | null> {
    return this.repo.findOne({ where: { organizationId, name } });
  }

  countByOrg(organizationId: string): Promise<number> {
    return this.repo.count({ where: { organizationId } });
  }

  findMineByOrg(organizationId: string, userId: string): Promise<Channel[]> {
    return this.repo
      .createQueryBuilder('channel')
      .innerJoin(
        ChannelMember,
        'membership',
        'membership.channelId = channel.id AND membership.userId = :userId',
        { userId },
      )
      .where('channel.organizationId = :organizationId', { organizationId })
      .orderBy('channel.createdAt', 'ASC')
      .getMany();
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
