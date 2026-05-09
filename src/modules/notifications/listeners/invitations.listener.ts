import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../services/notifications.service';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

interface InvitationCreatedEvent {
  email: string;
  orgName: string;
  inviterName: string;
  role: MembershipRole;
  rawToken: string;
}

@Injectable()
export class InvitationsListener {
  private readonly logger = new Logger(InvitationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('invitation.created', { async: true })
  async handleInvitationCreated(
    payload: InvitationCreatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Queuing invite email to ${payload.email} for org ${payload.orgName}`,
    );

    const frontendUrl = this.config.getOrThrow<string>('frontendUrl');
    const acceptUrl = `${frontendUrl}/invitations/accept?token=${payload.rawToken}`;
    const declineUrl = `${frontendUrl}/invitations/decline?token=${payload.rawToken}`;

    await this.notificationsService.sendInviteEmail(
      payload.email,
      payload.orgName,
      payload.inviterName,
      payload.role,
      acceptUrl,
      declineUrl,
    );
  }
}
