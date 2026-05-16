import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentsRepository } from './repositories/enrollments.repository';
import { EnrollmentsService } from './services/enrollments.service';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { OrgEnrollmentsController } from './controllers/org-enrollments.controller';
import { ProgramsModule } from '../programs/programs.module';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), ProgramsModule],
  controllers: [EnrollmentsController, OrgEnrollmentsController],
  providers: [EnrollmentsRepository, EnrollmentsService, OrgRolesGuard],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
