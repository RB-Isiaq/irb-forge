import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';
import { UsersModule } from '../users';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), UsersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository, OrgRolesGuard],
  exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}
