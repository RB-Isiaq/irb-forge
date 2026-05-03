import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from './entities/invitation.entity';
import { InvitationsRepository } from './repositories/invitations.repository';
import { InvitationsService } from './services/invitations.service';
import { OrgInvitationsController } from './controllers/org-invitations.controller';
import { InvitationsController } from './controllers/invitations.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';
import { NotificationsModule } from '../notifications';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation]), NotificationsModule],
  controllers: [OrgInvitationsController, InvitationsController],
  providers: [InvitationsService, InvitationsRepository, OrgRolesGuard],
  exports: [InvitationsService],
})
export class InvitationsModule {}
