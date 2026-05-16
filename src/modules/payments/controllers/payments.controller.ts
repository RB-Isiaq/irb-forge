import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { ApiOkWrappedResponse } from '../../../common/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Organization } from '../../organizations/entities/organization.entity';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ResponseMessage('Payment history retrieved')
  @ApiOkWrappedResponse(PaymentResponseDto)
  list(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.listByOrgPaginated(
      org.id,
      pagination.page,
      pagination.limit,
    );
  }
}
