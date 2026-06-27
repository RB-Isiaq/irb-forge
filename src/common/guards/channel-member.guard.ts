import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Channel } from '../../modules/channels/entities/channel.entity';
import { ChannelMember } from '../../modules/channels/entities/channel-member.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class ChannelMemberGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { channelId?: string };
      user: User;
      org: Organization;
      channel: Channel;
      channelMembership: ChannelMember;
    }>();

    const { user, org, params } = request;
    const channelId = params?.channelId;

    if (!channelId || !user || !org) return true;

    const channel = await this.dataSource
      .getRepository(Channel)
      .findOne({ where: { id: channelId, organizationId: org.id } });

    if (!channel) throw new NotFoundException('Channel not found');

    const channelMembership = await this.dataSource
      .getRepository(ChannelMember)
      .findOne({ where: { channelId, userId: user.id } });

    if (!channelMembership) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    request.channel = channel;
    request.channelMembership = channelMembership;

    return true;
  }
}
