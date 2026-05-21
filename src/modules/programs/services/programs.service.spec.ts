/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { ProgramsRepository } from '../repositories/programs.repository';
import { RedisService } from '../../../common/redis/redis.service';
import { Program } from '../entities/program.entity';
import { ProgramStatus } from '../enums/program-status.enum';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

const mockProgram = (overrides: Partial<Program> = {}): Program =>
  ({
    id: 'prog-uuid',
    organizationId: 'org-uuid',
    createdById: 'mentor-uuid',
    name: 'Test Program',
    description: null,
    status: ProgramStatus.DRAFT,
    capacity: null,
    startDate: null,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Program;

describe('ProgramsService', () => {
  let service: ProgramsService;
  let repo: jest.Mocked<ProgramsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        {
          provide: ProgramsRepository,
          useValue: {
            create: jest.fn(),
            findAllByOrg: jest.fn(),
            findOneByOrg: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(ProgramsService);
    repo = module.get(ProgramsRepository);
  });

  // ─── getOne ───────────────────────────────────────────────────────────────

  describe('getOne', () => {
    it('returns program when found', async () => {
      repo.findOneByOrg.mockResolvedValue(mockProgram());
      const result = await service.getOne('prog-uuid', 'org-uuid');
      expect(result.id).toBe('prog-uuid');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOneByOrg.mockResolvedValue(null);
      await expect(service.getOne('missing', 'org-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto = { name: 'Updated Name' };

    it('owner can update any program', async () => {
      repo.findOneByOrg.mockResolvedValue(mockProgram());
      repo.update.mockResolvedValue(mockProgram({ name: 'Updated Name' }));

      await service.update(
        'prog-uuid',
        'org-uuid',
        'owner-uuid',
        MembershipRole.OWNER,
        dto,
      );

      expect(repo.update).toHaveBeenCalled();
    });

    it('admin can update any program', async () => {
      repo.findOneByOrg.mockResolvedValue(mockProgram());
      repo.update.mockResolvedValue(mockProgram());

      await service.update(
        'prog-uuid',
        'org-uuid',
        'admin-uuid',
        MembershipRole.ADMIN,
        dto,
      );

      expect(repo.update).toHaveBeenCalled();
    });

    it('mentor can update a program they created', async () => {
      repo.findOneByOrg.mockResolvedValue(
        mockProgram({ createdById: 'mentor-uuid' }),
      );
      repo.update.mockResolvedValue(mockProgram());

      await service.update(
        'prog-uuid',
        'org-uuid',
        'mentor-uuid',
        MembershipRole.MENTOR,
        dto,
      );

      expect(repo.update).toHaveBeenCalled();
    });

    it("throws ForbiddenException when mentor tries to update another mentor's program", async () => {
      repo.findOneByOrg.mockResolvedValue(
        mockProgram({ createdById: 'other-mentor-uuid' }),
      );

      await expect(
        service.update(
          'prog-uuid',
          'org-uuid',
          'my-mentor-uuid',
          MembershipRole.MENTOR,
          dto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when mentor updates a program with null createdById', async () => {
      repo.findOneByOrg.mockResolvedValue(mockProgram({ createdById: null }));

      await expect(
        service.update(
          'prog-uuid',
          'org-uuid',
          'mentor-uuid',
          MembershipRole.MENTOR,
          dto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when program does not exist', async () => {
      repo.findOneByOrg.mockResolvedValue(null);

      await expect(
        service.update(
          'missing',
          'org-uuid',
          'owner-uuid',
          MembershipRole.OWNER,
          dto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the program', async () => {
      const program = mockProgram();
      repo.findOneByOrg.mockResolvedValue(program);
      repo.delete.mockResolvedValue();

      await service.delete('prog-uuid', 'org-uuid');

      expect(repo.delete).toHaveBeenCalledWith(program);
    });

    it('throws NotFoundException when program does not exist', async () => {
      repo.findOneByOrg.mockResolvedValue(null);
      await expect(service.delete('missing', 'org-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
