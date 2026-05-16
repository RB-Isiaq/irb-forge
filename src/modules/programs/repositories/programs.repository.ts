import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../entities/program.entity';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';

@Injectable()
export class ProgramsRepository {
  constructor(
    @InjectRepository(Program)
    private readonly repo: Repository<Program>,
  ) {}

  create(
    organizationId: string,
    createdById: string | null,
    dto: CreateProgramDto,
  ): Promise<Program> {
    const program = this.repo.create({
      organizationId,
      createdById,
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status,
      capacity: dto.capacity ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
    return this.repo.save(program);
  }

  findAllByOrg(organizationId: string): Promise<Program[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  findOneByOrg(id: string, organizationId: string): Promise<Program | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async update(program: Program, dto: UpdateProgramDto): Promise<Program> {
    Object.assign(program, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.startDate !== undefined && {
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
    });
    return this.repo.save(program);
  }

  async delete(program: Program): Promise<void> {
    await this.repo.remove(program);
  }
}
