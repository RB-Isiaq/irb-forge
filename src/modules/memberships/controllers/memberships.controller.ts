import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipsService } from '../services/memberships.service';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { MembershipResponseDto } from '../dto/membership-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { User } from '../../users/entities/user.entity';
import { Membership } from '../entities/membership.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { MembershipRole } from '../enums/membership-role.enum';
import { ApiOkWrappedResponse } from '../../../common/swagger/response.decorators';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Membership => {
    return ctx.switchToHttp().getRequest<{ membership: Membership }>()
      .membership;
  },
);

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ResponseMessage('Members retrieved')
  @ApiOkWrappedResponse(MembershipResponseDto)
  findAll(@CurrentOrg() org: Organization, @Query() pagination: PaginationDto) {
    return this.membershipsService.findAllByOrgPaginated(
      org.id,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('me')
  @ResponseMessage('Membership retrieved')
  @ApiOkWrappedResponse(MembershipResponseDto)
  getMyMembership(@CurrentMembership() membership: Membership): Membership {
    return membership;
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.membershipsService.leave(org, user.id);
  }

  @Patch(':userId/role')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ResponseMessage('Role updated')
  @ApiOkWrappedResponse(MembershipResponseDto)
  updateRole(
    @CurrentOrg() org: Organization,
    @Param('userId') targetUserId: string,
    @CurrentMembership() actorMembership: Membership,
    @Body() dto: UpdateRoleDto,
  ): Promise<Membership> {
    return this.membershipsService.updateRole(
      org,
      targetUserId,
      actorMembership,
      dto,
    );
  }

  @Delete(':userId')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentOrg() org: Organization,
    @Param('userId') targetUserId: string,
    @CurrentMembership() actorMembership: Membership,
  ): Promise<void> {
    return this.membershipsService.removeMember(
      org,
      targetUserId,
      actorMembership,
    );
  }
}
