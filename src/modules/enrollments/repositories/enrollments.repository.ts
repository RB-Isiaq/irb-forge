import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

@Injectable()
export class EnrollmentsRepository {
  constructor(
    @InjectRepository(Enrollment)
    private readonly repo: Repository<Enrollment>,
  ) {}

  enroll(userId: string, programId: string): Promise<Enrollment> {
    const enrollment = this.repo.create({
      userId,
      programId,
      enrolledAt: new Date(),
    });
    return this.repo.save(enrollment);
  }

  findByProgram(programId: string): Promise<Enrollment[]> {
    return this.repo.find({
      where: { programId },
      relations: ['user'],
      order: { enrolledAt: 'ASC' },
    });
  }

  findOne(userId: string, programId: string): Promise<Enrollment | null> {
    return this.repo.findOne({ where: { userId, programId } });
  }

  countActive(programId: string): Promise<number> {
    return this.repo.count({
      where: { programId, status: EnrollmentStatus.ACTIVE },
    });
  }

  async updateStatus(
    enrollment: Enrollment,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    enrollment.status = status;
    if (status === EnrollmentStatus.COMPLETED) {
      enrollment.completedAt = new Date();
    }
    return this.repo.save(enrollment);
  }

  findByUserInOrg(
    userId: string,
    organizationId: string,
  ): Promise<Enrollment[]> {
    return this.repo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.program', 'program')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('program.organizationId = :organizationId', { organizationId })
      .orderBy('enrollment.enrolledAt', 'DESC')
      .getMany();
  }

  async remove(enrollment: Enrollment): Promise<void> {
    await this.repo.remove(enrollment);
  }
}
