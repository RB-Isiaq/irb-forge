import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { ChannelMessage } from './entities/channel-message.entity';
import { ChannelsRepository } from './repositories/channels.repository';
import { ChannelMembersRepository } from './repositories/channel-members.repository';
import { ChannelMessagesRepository } from './repositories/channel-messages.repository';
import { ChannelsService } from './services/channels.service';
import { ChannelMessagesService } from './services/channel-messages.service';
import { ChannelsController } from './controllers/channels.controller';
import { ChannelMessagesController } from './controllers/channel-messages.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';
import { ChannelMemberGuard } from '../../common/guards/channel-member.guard';
import { SubscriptionsModule } from '../subscriptions';
import { MembershipsModule } from '../memberships';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelMember, ChannelMessage]),
    SubscriptionsModule,
    MembershipsModule,
  ],
  controllers: [ChannelsController, ChannelMessagesController],
  providers: [
    ChannelsRepository,
    ChannelMembersRepository,
    ChannelMessagesRepository,
    ChannelsService,
    ChannelMessagesService,
    OrgRolesGuard,
    ChannelMemberGuard,
  ],
  exports: [ChannelsService, ChannelMessagesService],
})
export class ChannelsModule {}
