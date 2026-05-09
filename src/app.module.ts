import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { configuration, validationSchema } from './config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis';
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('redis.url'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
