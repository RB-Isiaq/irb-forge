import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  PushSenderService,
  PushRecipient,
} from '../services/push-sender.service';
import { ChannelMember } from '../../channels/entities/channel-member.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

interface ChannelMessageCreatedEvent {
  organizationId: string;
  channelId: string;
  channelName: string;
  authorId: string;
  content: string;
}

const BODY_PREVIEW_LENGTH = 150;

@Injectable()
export class ChannelMessagesListener {
  private readonly logger = new Logger(ChannelMessagesListener.name);

  constructor(
    private readonly pushSender: PushSenderService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('channel-message.created', { async: true })
  async handleChannelMessageCreated(
    event: ChannelMessageCreatedEvent,
  ): Promise<void> {
    try {
      const org = await this.dataSource
        .getRepository(Organization)
        .findOne({ where: { id: event.organizationId } });
      if (!org) {
        this.logger.warn(
          `Org not found for channel message: ${event.organizationId}`,
        );
        return;
      }

      const author = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: event.authorId } });

      const channelMembers = await this.dataSource
        .getRepository(ChannelMember)
        .find({
          where: { channelId: event.channelId },
          relations: ['user'],
        });

      const recipients: PushRecipient[] = channelMembers
        .filter(
          (m): m is ChannelMember & { user: User & { pushToken: string } } =>
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
        `Sending push to ${recipients.length} member(s) in channel ${event.channelName} (org ${org.slug})`,
      );

      const staleUserIds = await this.pushSender.send(
        recipients,
        `#${event.channelName} in ${org.name}`,
        `${authorName}: ${body}`,
        {
          url: `/channels/${event.channelId}`,
          orgSlug: org.slug,
          channelId: event.channelId,
        },
      );

      if (staleUserIds.length > 0) {
        await this.dataSource
          .getRepository(User)
          .update(staleUserIds, { pushToken: null });
      }
    } catch (err) {
      this.logger.error(
        `Failed to send channel message push for channel ${event.channelId}`,
        err,
      );
    }
  }
}
