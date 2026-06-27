import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelMessagesService } from '../services/channel-messages.service';
import { SendChannelMessageDto } from '../dto/send-channel-message.dto';
import { ListChannelMessagesDto } from '../dto/list-channel-messages.dto';
import { ChannelMessageResponseDto } from '../dto/channel-message-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { CurrentChannel } from '../../../common/decorators/current-channel.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ChannelMemberGuard } from '../../../common/guards/channel-member.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../../../common/swagger';
import { Organization } from '../../organizations/entities/organization.entity';
import { Channel } from '../entities/channel.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Channel Messages')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard, ChannelMemberGuard)
@Controller('organizations/:slug/channels/:channelId/messages')
export class ChannelMessagesController {
  constructor(
    private readonly channelMessagesService: ChannelMessagesService,
  ) {}

  @Post()
  @ResponseMessage('Message sent')
  @ApiCreatedWrappedResponse(ChannelMessageResponseDto)
  create(
    @Param('slug') _slug: string,
    @Param('channelId') _channelId: string,
    @CurrentOrg() org: Organization,
    @CurrentChannel() channel: Channel,
    @CurrentUser() user: User,
    @Body() dto: SendChannelMessageDto,
  ) {
    return this.channelMessagesService.create(
      org.id,
      channel.id,
      channel.name,
      user.id,
      dto,
    );
  }

  @Get()
  @ResponseMessage('Channel messages retrieved')
  @ApiOkWrappedResponse(ChannelMessageResponseDto)
  list(
    @Param('slug') _slug: string,
    @Param('channelId') _channelId: string,
    @CurrentChannel() channel: Channel,
    @Query() query: ListChannelMessagesDto,
  ) {
    return this.channelMessagesService.listByChannel(
      channel.id,
      query.before,
      query.limit,
    );
  }
}
