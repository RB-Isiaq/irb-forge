import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessagesRepository } from './repositories/messages.repository';
import { MessagesService } from './services/messages.service';
import { MessagesController } from './controllers/messages.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService, OrgRolesGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
