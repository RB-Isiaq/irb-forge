import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentsRepository } from '../repositories/enrollments.repository';
import { ProgramsRepository } from '../../programs/repositories/programs.repository';
import { UpdateEnrollmentStatusDto } from '../dto/update-enrollment-status.dto';
import { Enrollment } from '../entities/enrollment.entity';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';
import { ProgramStatus } from '../../programs/enums/program-status.enum';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollmentsRepo: EnrollmentsRepository,
    private readonly programsRepo: ProgramsRepository,
  ) {}

  async enroll(
    userId: string,
    programId: string,
    organizationId: string,
    memberRole: MembershipRole,
  ): Promise<Enrollment> {
    if (memberRole !== MembershipRole.MEMBER) {
      throw new ForbiddenException('Only members can enroll in programs');
    }

    const program = await this.programsRepo.findOneByOrg(
      programId,
      organizationId,
    );
    if (!program) throw new NotFoundException('Program not found');

    if (program.status !== ProgramStatus.ACTIVE) {
      throw new BadRequestException('Cannot enroll in a non-active program');
    }

    if (program.capacity !== null) {
      const count = await this.enrollmentsRepo.countActive(programId);
      if (count >= program.capacity) {
        throw new ConflictException('Program has reached its capacity');
      }
    }

    const existing = await this.enrollmentsRepo.findOne(userId, programId);
    if (existing) {
      throw new ConflictException('Already enrolled in this program');
    }

    return this.enrollmentsRepo.enroll(userId, programId);
  }

  async listByProgram(
    programId: string,
    organizationId: string,
  ): Promise<Enrollment[]> {
    const program = await this.programsRepo.findOneByOrg(
      programId,
      organizationId,
    );
    if (!program) throw new NotFoundException('Program not found');
    return this.enrollmentsRepo.findByProgram(programId);
  }

  listMyEnrollments(
    userId: string,
    organizationId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentsRepo.findByUserInOrg(userId, organizationId);
  }

  async getMyEnrollment(
    userId: string,
    programId: string,
    organizationId: string,
  ): Promise<Enrollment | null> {
    const program = await this.programsRepo.findOneByOrg(
      programId,
      organizationId,
    );
    if (!program) throw new NotFoundException('Program not found');
    return this.enrollmentsRepo.findOne(userId, programId);
  }

  async drop(
    userId: string,
    programId: string,
    organizationId: string,
  ): Promise<void> {
    const program = await this.programsRepo.findOneByOrg(
      programId,
      organizationId,
    );
    if (!program) throw new NotFoundException('Program not found');

    const enrollment = await this.enrollmentsRepo.findOne(userId, programId);
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Can only drop an active enrollment');
    }

    await this.enrollmentsRepo.remove(enrollment);
  }

  async updateStatus(
    targetUserId: string,
    programId: string,
    organizationId: string,
    dto: UpdateEnrollmentStatusDto,
  ): Promise<Enrollment> {
    const program = await this.programsRepo.findOneByOrg(
      programId,
      organizationId,
    );
    if (!program) throw new NotFoundException('Program not found');

    const enrollment = await this.enrollmentsRepo.findOne(
      targetUserId,
      programId,
    );
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.enrollmentsRepo.updateStatus(enrollment, dto.status);
  }
}
