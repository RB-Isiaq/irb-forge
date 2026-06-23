import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_QUEUE } from './queues/email.queue';
import { NotificationsService } from './services/notifications.service';
import { EmailSenderService } from './services/email-sender.service';
import { PushSenderService } from './services/push-sender.service';
import { EmailProcessor } from './processors/email.processor';
import { AuthListener } from './listeners/auth.listener';
import { InvitationsListener } from './listeners/invitations.listener';
import { PaymentsListener } from './listeners/payments.listener';
import { MessagesListener } from './listeners/messages.listener';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [
    NotificationsService,
    EmailSenderService,
    PushSenderService,
    EmailProcessor,
    AuthListener,
    InvitationsListener,
    PaymentsListener,
    MessagesListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
