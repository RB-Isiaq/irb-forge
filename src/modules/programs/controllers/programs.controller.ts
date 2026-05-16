import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from '../services/programs.service';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { ProgramResponseDto } from '../dto/program-response.dto';
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
import { Organization } from '../../organizations/entities/organization.entity';
import { Membership } from '../../memberships/entities/membership.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Programs')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Program created')
  @ApiCreatedWrappedResponse(ProgramResponseDto)
  create(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Body() dto: CreateProgramDto,
  ) {
    return this.programsService.create(org.id, user.id, dto);
  }

  @Get()
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Programs retrieved')
  @ApiOkWrappedResponse(ProgramResponseDto)
  list(@Param('slug') _slug: string, @CurrentOrg() org: Organization) {
    return this.programsService.listByOrg(org.id);
  }

  @Get(':id')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Program retrieved')
  @ApiOkWrappedResponse(ProgramResponseDto)
  getOne(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @CurrentOrg() org: Organization,
  ) {
    return this.programsService.getOne(id, org.id);
  }

  @Patch(':id')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Program updated')
  @ApiOkWrappedResponse(ProgramResponseDto)
  update(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programsService.update(
      id,
      org.id,
      user.id,
      membership.role,
      dto,
    );
  }

  @Delete(':id')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @CurrentOrg() org: Organization,
  ) {
    return this.programsService.delete(id, org.id);
  }
}
