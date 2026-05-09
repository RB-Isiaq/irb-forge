import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from './entities/membership.entity';
import { MembershipsRepository } from './repositories/memberships.repository';
import { MembershipsService } from './services/memberships.service';
import { MembershipsController } from './controllers/memberships.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsRepository, OrgRolesGuard],
  exports: [MembershipsService, MembershipsRepository],
})
export class MembershipsModule {}
