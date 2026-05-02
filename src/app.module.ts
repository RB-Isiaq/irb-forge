import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { configuration, validationSchema } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { OrganizationsModule } from './modules/organizations';
import { MembershipsModule } from './modules/memberships';
import { InvitationsModule } from './modules/invitations';
import { ProgramsModule } from './modules/programs';
import { EnrollmentsModule } from './modules/enrollments';
import { SubscriptionsModule } from './modules/subscriptions';
import { PaymentsModule } from './modules/payments';
import { MessagesModule } from './modules/messages';
import { NotificationsModule } from './modules/notifications';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    InvitationsModule,
    ProgramsModule,
    EnrollmentsModule,
    SubscriptionsModule,
    PaymentsModule,
    MessagesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
