import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { OrgRoles } from '../../../common/decorators/org-roles.decorator';
import { OrgRolesGuard } from '../../../common/guards/org-roles.guard';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../../../common/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  @ResponseMessage('Subscription retrieved')
  @ApiOkWrappedResponse(SubscriptionResponseDto)
  get(@Param('slug') _slug: string, @CurrentOrg() org: Organization) {
    return this.subscriptionsService.getByOrg(org.id);
  }

  @Post('checkout')
  @OrgRoles(MembershipRole.OWNER)
  @ResponseMessage('Checkout session created')
  @ApiCreatedWrappedResponse(Object)
  checkout(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.createCheckoutSession(org, user);
  }

  @Post('cancel')
  @OrgRoles(MembershipRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Subscription cancelled')
  @ApiOkWrappedResponse(Object)
  cancel(@Param('slug') _slug: string, @CurrentOrg() org: Organization) {
    return this.subscriptionsService.cancelSubscription(org.id);
  }
}
