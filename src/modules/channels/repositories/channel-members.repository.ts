import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelMember } from '../entities/channel-member.entity';

@Injectable()
export class ChannelMembersRepository {
  constructor(
    @InjectRepository(ChannelMember)
    private readonly repo: Repository<ChannelMember>,
  ) {}

  add(
    channelId: string,
    organizationId: string,
    userId: string,
  ): Promise<ChannelMember> {
    const member = this.repo.create({ channelId, organizationId, userId });
    return this.repo.save(member);
  }

  findOne(channelId: string, userId: string): Promise<ChannelMember | null> {
    return this.repo.findOne({ where: { channelId, userId } });
  }

  findAllByChannel(channelId: string): Promise<ChannelMember[]> {
    return this.repo.find({
      where: { channelId },
      relations: ['user'],
    });
  }

  async remove(channelId: string, userId: string): Promise<void> {
    await this.repo.delete({ channelId, userId });
  }

  async removeAllForUserInOrg(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    await this.repo.delete({ userId, organizationId });
  }
}
