import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InvitationsService } from '../services/invitations.service';
import { RespondInvitationDto } from '../dto/respond-invitation.dto';
import { InvitationPreviewDto } from '../dto/invitation-preview.dto';
import { InvitationResponseDto } from '../dto/invitation-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { User } from '../../users/entities/user.entity';
import { Invitation } from '../entities/invitation.entity';
import { ApiOkWrappedResponse } from '../../../common/swagger/response.decorators';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('preview')
  @Public()
  @ResponseMessage('Invitation preview retrieved')
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Raw invitation token from email link',
  })
  @ApiOkWrappedResponse(InvitationPreviewDto)
  preview(@Query('token') token: string): Promise<InvitationPreviewDto> {
    return this.invitationsService.preview(token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ResponseMessage('Your pending invitations retrieved')
  @ApiOkWrappedResponse(InvitationResponseDto)
  findMine(@CurrentUser() user: User): Promise<Invitation[]> {
    return this.invitationsService.findMyInvitations(user.email);
  }

  @Post('accept')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Invitation accepted')
  accept(
    @CurrentUser() user: User,
    @Body() dto: RespondInvitationDto,
  ): Promise<void> {
    return this.invitationsService.accept(user, dto.token);
  }

  @Post('decline')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Invitation declined')
  decline(
    @CurrentUser() user: User,
    @Body() dto: RespondInvitationDto,
  ): Promise<void> {
    return this.invitationsService.decline(user, dto.token);
  }
}
