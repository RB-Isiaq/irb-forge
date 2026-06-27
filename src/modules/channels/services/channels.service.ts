import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChannelsRepository } from '../repositories/channels.repository';
import { ChannelMembersRepository } from '../repositories/channel-members.repository';
import { Channel } from '../entities/channel.entity';
import { ChannelMember } from '../entities/channel-member.entity';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { SubscriptionPlan } from '../../subscriptions/enums/subscription-plan.enum';
import { MembershipsRepository } from '../../memberships/repositories/memberships.repository';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

const FREE_PLAN_CHANNEL_LIMIT = 1;

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelsRepo: ChannelsRepository,
    private readonly channelMembersRepo: ChannelMembersRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly membershipsRepo: MembershipsRepository,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateChannelDto,
  ): Promise<Channel> {
    const existing = await this.channelsRepo.findByOrgAndName(
      organizationId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException('A channel with this name already exists');
    }

    const subscription =
      await this.subscriptionsService.getByOrg(organizationId);
    if (subscription.plan === SubscriptionPlan.FREE) {
      const count = await this.channelsRepo.countByOrg(organizationId);
      if (count >= FREE_PLAN_CHANNEL_LIMIT) {
        throw new ForbiddenException(
          'Free plan is limited to 1 channel — upgrade to Pro to add more.',
        );
      }
    }

    const channel = await this.channelsRepo.create(
      organizationId,
      dto.name,
      userId,
    );
    await this.channelMembersRepo.add(channel.id, organizationId, userId);
    return channel;
  }

  listMine(organizationId: string, userId: string): Promise<Channel[]> {
    return this.channelsRepo.findMineByOrg(organizationId, userId);
  }

  async delete(organizationId: string, channelId: string): Promise<void> {
    const channel = await this.getOrgChannel(organizationId, channelId);
    if (channel.isDefault) {
      throw new ForbiddenException('The default channel cannot be deleted');
    }
    await this.channelsRepo.delete(channelId);
  }

  async addMember(
    organizationId: string,
    channelId: string,
    requesterId: string,
    requesterRole: MembershipRole,
    targetUserId: string,
  ): Promise<ChannelMember> {
    const channel = await this.getOrgChannel(organizationId, channelId);
    this.assertCanManageMembers(channel, requesterId, requesterRole);

    const targetMembership = await this.membershipsRepo.findByUserAndOrg(
      targetUserId,
      organizationId,
    );
    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    const existing = await this.channelMembersRepo.findOne(
      channel.id,
      targetUserId,
    );
    if (existing) {
      throw new ConflictException('User is already in this channel');
    }

    return this.channelMembersRepo.add(
      channel.id,
      organizationId,
      targetUserId,
    );
  }

  async listMembers(
    organizationId: string,
    channelId: string,
    requesterId: string,
    requesterRole: MembershipRole,
  ): Promise<ChannelMember[]> {
    const channel = await this.getOrgChannel(organizationId, channelId);
    this.assertCanManageMembers(channel, requesterId, requesterRole);
    return this.channelMembersRepo.findAllByChannel(channelId);
  }

  async removeMember(
    organizationId: string,
    channelId: string,
    requesterId: string,
    requesterRole: MembershipRole,
    targetUserId: string,
  ): Promise<void> {
    const channel = await this.getOrgChannel(organizationId, channelId);
    if (channel.isDefault) {
      throw new ForbiddenException(
        'Members of the default channel are managed automatically',
      );
    }
    this.assertCanManageMembers(channel, requesterId, requesterRole);
    await this.channelMembersRepo.remove(channel.id, targetUserId);
  }

  private async getOrgChannel(
    organizationId: string,
    channelId: string,
  ): Promise<Channel> {
    const channel = await this.channelsRepo.findByOrgAndId(
      organizationId,
      channelId,
    );
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  private assertCanManageMembers(
    channel: Channel,
    requesterId: string,
    requesterRole: MembershipRole,
  ): void {
    const isOwnerOrAdmin =
      requesterRole === MembershipRole.OWNER ||
      requesterRole === MembershipRole.ADMIN;
    const isCreator =
      channel.createdById !== null && channel.createdById === requesterId;

    if (!isOwnerOrAdmin && !isCreator) {
      throw new ForbiddenException(
        'Only the channel creator or an org owner/admin can manage members',
      );
    }
  }
}
