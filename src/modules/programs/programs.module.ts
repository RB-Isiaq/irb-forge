import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './entities/program.entity';
import { ProgramsRepository } from './repositories/programs.repository';
import { ProgramsService } from './services/programs.service';
import { ProgramsController } from './controllers/programs.controller';
import { OrgRolesGuard } from '../../common/guards/org-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Program])],
  controllers: [ProgramsController],
  providers: [ProgramsRepository, ProgramsService, OrgRolesGuard],
  exports: [ProgramsService, ProgramsRepository],
})
export class ProgramsModule {}
