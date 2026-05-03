import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_QUEUE } from './queues/email.queue';
import { NotificationsService } from './services/notifications.service';
import { EmailProcessor } from './processors/email.processor';
import { AuthListener } from './listeners/auth.listener';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [NotificationsService, EmailProcessor, AuthListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
