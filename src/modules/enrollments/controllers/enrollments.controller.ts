import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from '../services/enrollments.service';
import { UpdateEnrollmentStatusDto } from '../dto/update-enrollment-status.dto';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
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

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/programs/:programId/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Enrolled successfully')
  @ApiCreatedWrappedResponse(EnrollmentResponseDto)
  enroll(
    @Param('slug') _slug: string,
    @Param('programId') programId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @CurrentMembership() membership: Membership,
  ) {
    return this.enrollmentsService.enroll(
      user.id,
      programId,
      org.id,
      membership.role,
    );
  }

  @Get()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Enrollments retrieved')
  @ApiOkWrappedResponse(EnrollmentResponseDto)
  list(
    @Param('slug') _slug: string,
    @Param('programId') programId: string,
    @CurrentOrg() org: Organization,
  ) {
    return this.enrollmentsService.listByProgram(programId, org.id);
  }

  @Get('me')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Enrollment retrieved')
  @ApiOkWrappedResponse(EnrollmentResponseDto)
  getMyEnrollment(
    @Param('slug') _slug: string,
    @Param('programId') programId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ) {
    return this.enrollmentsService.getMyEnrollment(user.id, programId, org.id);
  }

  @Delete('me')
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  drop(
    @Param('slug') _slug: string,
    @Param('programId') programId: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ) {
    return this.enrollmentsService.drop(user.id, programId, org.id);
  }

  @Patch(':userId')
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Enrollment updated')
  @ApiOkWrappedResponse(EnrollmentResponseDto)
  updateStatus(
    @Param('slug') _slug: string,
    @Param('programId') programId: string,
    @Param('userId') targetUserId: string,
    @CurrentOrg() org: Organization,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateStatus(
      targetUserId,
      programId,
      org.id,
      dto,
    );
  }
}
