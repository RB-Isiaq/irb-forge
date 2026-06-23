import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  PushSenderService,
  PushRecipient,
} from '../services/push-sender.service';
import { Membership } from '../../memberships/entities/membership.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

interface MessageCreatedEvent {
  organizationId: string;
  authorId: string;
  content: string;
}

const BODY_PREVIEW_LENGTH = 150;

@Injectable()
export class MessagesListener {
  private readonly logger = new Logger(MessagesListener.name);

  constructor(
    private readonly pushSender: PushSenderService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('message.created', { async: true })
  async handleMessageCreated(event: MessageCreatedEvent): Promise<void> {
    try {
      const org = await this.dataSource
        .getRepository(Organization)
        .findOne({ where: { id: event.organizationId } });
      if (!org) {
        this.logger.warn(`Org not found for message: ${event.organizationId}`);
        return;
      }

      const author = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: event.authorId } });

      const memberships = await this.dataSource.getRepository(Membership).find({
        where: { organizationId: event.organizationId },
        relations: ['user'],
      });

      const recipients: PushRecipient[] = memberships
        .filter(
          (m): m is Membership & { user: User & { pushToken: string } } =>
            m.userId !== event.authorId && !!m.user?.pushToken,
        )
        .map((m) => ({ userId: m.userId, token: m.user.pushToken }));

      if (recipients.length === 0) return;

      const authorName = author
        ? [author.firstName, author.lastName].filter(Boolean).join(' ') ||
          author.email
        : 'Someone';
      const body =
        event.content.length > BODY_PREVIEW_LENGTH
          ? `${event.content.slice(0, BODY_PREVIEW_LENGTH)}…`
          : event.content;

      this.logger.log(
        `Sending push to ${recipients.length} member(s) in org ${org.slug}`,
      );

      const staleUserIds = await this.pushSender.send(
        recipients,
        `New message in ${org.name}`,
        `${authorName}: ${body}`,
        { url: '/messages', orgSlug: org.slug },
      );

      if (staleUserIds.length > 0) {
        await this.dataSource
          .getRepository(User)
          .update(staleUserIds, { pushToken: null });
      }
    } catch (err) {
      this.logger.error(
        `Failed to send message push for org ${event.organizationId}`,
        err,
      );
    }
  }
}
