import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ProgramsRepository } from '../repositories/programs.repository';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { RedisService } from '../../../common/redis/redis.service';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { Program } from '../entities/program.entity';
import { ProgramStatus } from '../enums/program-status.enum';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

const PROGRAMS_CACHE_TTL = 30;

const VALID_TRANSITIONS: Partial<Record<ProgramStatus, ProgramStatus[]>> = {
  [ProgramStatus.DRAFT]: [ProgramStatus.ACTIVE, ProgramStatus.CANCELLED],
  [ProgramStatus.ACTIVE]: [ProgramStatus.COMPLETED, ProgramStatus.CANCELLED],
};

@Injectable()
export class ProgramsService {
  constructor(
    private readonly programsRepo: ProgramsRepository,
    private readonly redisService: RedisService,
  ) {}

  private programsCacheKey(orgId: string) {
    return `cache:programs:${orgId}`;
  }

  async invalidateProgramsCache(organizationId: string): Promise<void> {
    await this.redisService.del(this.programsCacheKey(organizationId));
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateProgramDto,
  ): Promise<Program> {
    const program = await this.programsRepo.create(organizationId, userId, dto);
    await this.invalidateProgramsCache(organizationId);
    return program;
  }

  listByOrg(organizationId: string): Promise<Program[]> {
    return this.programsRepo.findAllByOrg(organizationId);
  }

  async listByOrgPaginated(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<Program>> {
    const isDefaultRequest = page === 1 && limit === 20;
    const cacheKey = this.programsCacheKey(organizationId);

    if (isDefaultRequest) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached) as PaginatedResponseDto<Program>;
    }

    const [items, total] = await this.programsRepo.findAllByOrgPaginated(
      organizationId,
      page,
      limit,
    );
    const result = new PaginatedResponseDto(items, total, page, limit);

    if (isDefaultRequest) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        PROGRAMS_CACHE_TTL,
      );
    }

    return result;
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

    if (dto.status && dto.status !== program.status) {
      const allowed = VALID_TRANSITIONS[program.status];
      if (!allowed || !allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition program from '${program.status}' to '${dto.status}'`,
        );
      }
    }

    const updated = await this.programsRepo.update(program, dto);
    await this.invalidateProgramsCache(organizationId);
    return updated;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const program = await this.getOne(id, organizationId);
    await this.programsRepo.delete(program);
    await this.invalidateProgramsCache(organizationId);
  }
}
