import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from '../services/channels.service';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { AddChannelMemberDto } from '../dto/add-channel-member.dto';
import { ChannelResponseDto } from '../dto/channel-response.dto';
import { ChannelMemberResponseDto } from '../dto/channel-member-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { CurrentMembership } from '../../../common/decorators/current-membership.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../../../common/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Membership } from '../../memberships/entities/membership.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Channel created')
  @ApiCreatedWrappedResponse(ChannelResponseDto)
  create(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(org.id, user.id, dto);
  }

  @Get()
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Channels retrieved')
  @ApiOkWrappedResponse(ChannelResponseDto)
  list(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.listMine(org.id, user.id);
  }

  @Delete(':channelId')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ResponseMessage('Channel deleted')
  delete(
    @Param('slug') _slug: string,
    @Param('channelId') channelId: string,
    @CurrentOrg() org: Organization,
  ) {
    return this.channelsService.delete(org.id, channelId);
  }

  @Get(':channelId/members')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Channel members retrieved')
  @ApiOkWrappedResponse(ChannelMemberResponseDto)
  listMembers(
    @Param('slug') _slug: string,
    @Param('channelId') channelId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership,
  ) {
    return this.channelsService.listMembers(
      org.id,
      channelId,
      user.id,
      membership.role,
    );
  }

  @Post(':channelId/members')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Member added to channel')
  addMember(
    @Param('slug') _slug: string,
    @Param('channelId') channelId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership,
    @Body() dto: AddChannelMemberDto,
  ) {
    return this.channelsService.addMember(
      org.id,
      channelId,
      user.id,
      membership.role,
      dto.userId,
    );
  }

  @Delete(':channelId/members/:userId')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Member removed from channel')
  removeMember(
    @Param('slug') _slug: string,
    @Param('channelId') channelId: string,
    @Param('userId') userId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership,
  ) {
    return this.channelsService.removeMember(
      org.id,
      channelId,
      user.id,
      membership.role,
      userId,
    );
  }
}
