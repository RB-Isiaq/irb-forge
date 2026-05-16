import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from '../services/invitations.service';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationResponseDto } from '../dto/invitation-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { User } from '../../users/entities/user.entity';
import { Invitation } from '../entities/invitation.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import {
  ApiOkWrappedResponse,
  ApiCreatedWrappedResponse,
} from '../../../common/swagger/response.decorators';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
@Controller('organizations/:slug/invitations')
export class OrgInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ResponseMessage('Invitation sent')
  @ApiCreatedWrappedResponse(InvitationResponseDto)
  invite(
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationDto,
  ): Promise<Invitation> {
    return this.invitationsService.invite(org, user, dto);
  }

  @Get()
  @ResponseMessage('Invitations retrieved')
  @ApiOkWrappedResponse(InvitationResponseDto)
  findAll(@CurrentOrg() org: Organization): Promise<Invitation[]> {
    return this.invitationsService.findPendingByOrg(org.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentOrg() org: Organization,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invitationsService.cancel(org, id);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Invitation resent')
  resend(
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invitationsService.resend(org, id, user);
  }
}
