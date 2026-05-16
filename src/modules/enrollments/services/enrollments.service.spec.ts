/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsRepository } from '../repositories/enrollments.repository';
import { ProgramsRepository } from '../../programs/repositories/programs.repository';
import { Enrollment } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { Program } from '../../programs/entities/program.entity';
import { ProgramStatus } from '../../programs/enums/program-status.enum';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

const mockProgram = (overrides: Partial<Program> = {}): Program =>
  ({
    id: 'prog-uuid',
    organizationId: 'org-uuid',
    createdById: 'mentor-uuid',
    name: 'Backend Fundamentals',
    status: ProgramStatus.ACTIVE,
    capacity: 10,
    ...overrides,
  }) as Program;

const mockEnrollment = (overrides: Partial<Enrollment> = {}): Enrollment =>
  ({
    id: 'enr-uuid',
    userId: 'member-uuid',
    programId: 'prog-uuid',
    status: EnrollmentStatus.ACTIVE,
    enrolledAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Enrollment;

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollRepo: jest.Mocked<EnrollmentsRepository>;
  let programRepo: jest.Mocked<ProgramsRepository>;

  // Shared mock objects accessible across tests
  let mockQB: { setLock: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let mockManager: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockQB = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockProgram()), // default: active program found
    };

    mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
      count: jest.fn().mockResolvedValue(0), // default: 0 active enrollments
      findOne: jest.fn().mockResolvedValue(null), // default: not already enrolled
      save: jest.fn().mockResolvedValue(mockEnrollment()),
      create: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: EnrollmentsRepository,
          useValue: {
            enroll: jest.fn(),
            findByProgram: jest.fn(),
            findOne: jest.fn(),
            countActive: jest.fn(),
            updateStatus: jest.fn(),
            remove: jest.fn(),
            findByUserInOrg: jest.fn(),
          },
        },
        {
          provide: ProgramsRepository,
          useValue: { findOneByOrg: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(
                async (cb: (m: typeof mockManager) => Promise<unknown>) =>
                  cb(mockManager),
              ),
          },
        },
      ],
    }).compile();

    service = module.get(EnrollmentsService);
    enrollRepo = module.get(EnrollmentsRepository);
    programRepo = module.get(ProgramsRepository);
  });

  // ─── enroll ───────────────────────────────────────────────────────────────

  describe('enroll', () => {
    it('enrolls a member successfully', async () => {
      await service.enroll(
        'member-uuid',
        'prog-uuid',
        'org-uuid',
        MembershipRole.MEMBER,
      );
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException for owner role', async () => {
      await expect(
        service.enroll(
          'owner-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for admin role', async () => {
      await expect(
        service.enroll(
          'admin-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for mentor role', async () => {
      await expect(
        service.enroll(
          'mentor-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.MENTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when program does not exist', async () => {
      mockQB.getOne.mockResolvedValueOnce(null);
      await expect(
        service.enroll(
          'member-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when program is not active', async () => {
      mockQB.getOne.mockResolvedValueOnce(
        mockProgram({ status: ProgramStatus.DRAFT }),
      );
      await expect(
        service.enroll(
          'member-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.MEMBER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when program is at capacity', async () => {
      mockQB.getOne.mockResolvedValueOnce(mockProgram({ capacity: 5 }));
      mockManager.count.mockResolvedValueOnce(5);
      await expect(
        service.enroll(
          'member-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when already enrolled', async () => {
      mockManager.findOne.mockResolvedValueOnce(mockEnrollment());
      await expect(
        service.enroll(
          'member-uuid',
          'prog-uuid',
          'org-uuid',
          MembershipRole.MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('skips capacity check when program has null capacity (unlimited)', async () => {
      mockQB.getOne.mockResolvedValueOnce(mockProgram({ capacity: null }));
      await service.enroll(
        'member-uuid',
        'prog-uuid',
        'org-uuid',
        MembershipRole.MEMBER,
      );
      expect(mockManager.count).not.toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });
  });

  // ─── drop ─────────────────────────────────────────────────────────────────

  describe('drop', () => {
    it('removes an active enrollment', async () => {
      programRepo.findOneByOrg.mockResolvedValue(mockProgram());
      enrollRepo.findOne.mockResolvedValue(mockEnrollment());
      enrollRepo.remove.mockResolvedValue();

      await service.drop('member-uuid', 'prog-uuid', 'org-uuid');

      expect(enrollRepo.remove).toHaveBeenCalled();
    });

    it('throws NotFoundException when not enrolled', async () => {
      programRepo.findOneByOrg.mockResolvedValue(mockProgram());
      enrollRepo.findOne.mockResolvedValue(null);
      await expect(
        service.drop('member-uuid', 'prog-uuid', 'org-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when enrollment is not active', async () => {
      programRepo.findOneByOrg.mockResolvedValue(mockProgram());
      enrollRepo.findOne.mockResolvedValue(
        mockEnrollment({ status: EnrollmentStatus.COMPLETED }),
      );
      await expect(
        service.drop('member-uuid', 'prog-uuid', 'org-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when program not in this org', async () => {
      programRepo.findOneByOrg.mockResolvedValue(null);
      await expect(
        service.drop('member-uuid', 'prog-uuid', 'org-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('marks enrollment as completed', async () => {
      const enrollment = mockEnrollment();
      programRepo.findOneByOrg.mockResolvedValue(mockProgram());
      enrollRepo.findOne.mockResolvedValue(enrollment);
      enrollRepo.updateStatus.mockResolvedValue(
        mockEnrollment({ status: EnrollmentStatus.COMPLETED }),
      );

      const result = await service.updateStatus(
        'member-uuid',
        'prog-uuid',
        'org-uuid',
        {
          status: EnrollmentStatus.COMPLETED,
        },
      );

      expect(enrollRepo.updateStatus).toHaveBeenCalledWith(
        enrollment,
        EnrollmentStatus.COMPLETED,
      );
      expect(result.status).toBe(EnrollmentStatus.COMPLETED);
    });

    it('throws NotFoundException when enrollment not found', async () => {
      programRepo.findOneByOrg.mockResolvedValue(mockProgram());
      enrollRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('member-uuid', 'prog-uuid', 'org-uuid', {
          status: EnrollmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
