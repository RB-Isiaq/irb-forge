import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from '../services/messages.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
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

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(OrgRolesGuard)
@Controller('organizations/:slug/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @OrgRoles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MENTOR)
  @ResponseMessage('Message sent')
  @ApiCreatedWrappedResponse(MessageResponseDto)
  create(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(org.id, user.id, dto);
  }

  @Get()
  @OrgRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MENTOR,
    MembershipRole.MEMBER,
  )
  @ResponseMessage('Messages retrieved')
  @ApiOkWrappedResponse(MessageResponseDto)
  list(
    @Param('slug') _slug: string,
    @CurrentOrg() org: Organization,
    @Query() pagination: PaginationDto,
  ) {
    return this.messagesService.listByOrgPaginated(
      org.id,
      pagination.page,
      pagination.limit,
    );
  }
}
