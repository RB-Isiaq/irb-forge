import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProgramsRepository } from '../repositories/programs.repository';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { Program } from '../entities/program.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

@Injectable()
export class ProgramsService {
  constructor(private readonly programsRepo: ProgramsRepository) {}

  create(
    organizationId: string,
    userId: string,
    dto: CreateProgramDto,
  ): Promise<Program> {
    return this.programsRepo.create(organizationId, userId, dto);
  }

  listByOrg(organizationId: string): Promise<Program[]> {
    return this.programsRepo.findAllByOrg(organizationId);
  }

  async getOne(id: string, organizationId: string): Promise<Program> {
    const program = await this.programsRepo.findOneByOrg(id, organizationId);
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    memberRole: MembershipRole,
    dto: UpdateProgramDto,
  ): Promise<Program> {
    const program = await this.getOne(id, organizationId);

    const isOwnerOrAdmin =
      memberRole === MembershipRole.OWNER ||
      memberRole === MembershipRole.ADMIN;
    const isCreator =
      program.createdById !== null && program.createdById === userId;

    if (!isOwnerOrAdmin && !isCreator) {
      throw new ForbiddenException(
        'Mentors can only update programs they created',
      );
    }

    return this.programsRepo.update(program, dto);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const program = await this.getOne(id, organizationId);
    await this.programsRepo.delete(program);
  }
}
