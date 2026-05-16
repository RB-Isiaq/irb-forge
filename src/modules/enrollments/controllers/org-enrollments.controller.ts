import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from '../services/enrollments.service';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { ApiOkWrappedResponse } from '../../../common/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/enrollments')
export class OrgEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Enrollments retrieved')
  @ApiOkWrappedResponse(EnrollmentResponseDto)
  getMyEnrollments(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ) {
    return this.enrollmentsService.listMyEnrollments(user.id, org.id);
  }
}
