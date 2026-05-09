import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import {
  ApiOkWrappedResponse,
  ApiCreatedWrappedResponse,
} from '../../../common/swagger/response.decorators';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ResponseMessage('Organization created')
  @ApiCreatedWrappedResponse(OrganizationResponseDto)
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  @ResponseMessage('Organizations retrieved')
  @ApiOkWrappedResponse(OrganizationResponseDto)
  async findMine(@CurrentUser() user: User): Promise<Organization[]> {
    return this.orgsService.findMyOrgs(user.id);
  }

  @Get(':slug')
  @UseGuards(OrgRolesGuard)
  @ResponseMessage('Organization retrieved')
  @ApiOkWrappedResponse(OrganizationResponseDto)
  getOne(@CurrentOrg() org: Organization): Organization {
    return org;
  }

  @Patch(':slug')
  @UseGuards(OrgRolesGuard)
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ResponseMessage('Organization updated')
  @ApiOkWrappedResponse(OrganizationResponseDto)
  async update(
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.orgsService.update(org, user.id, dto);
  }

  @Delete(':slug')
  @UseGuards(OrgRolesGuard)
  @OrgRoles(MembershipRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.orgsService.delete(org, user.id);
  }
}
