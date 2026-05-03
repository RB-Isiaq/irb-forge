import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { User } from '../../users/entities/user.entity';

const mockUser = (): User =>
  ({
    id: 'user-uuid',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    isVerified: false,
    googleId: null,
    refreshToken: null,
    verificationToken: null,
    verificationTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            findByIdForAuth: jest.fn(),
            findByEmailForAuth: jest.fn(),
            findByGoogleId: jest.fn(),
            linkGoogleId: jest.fn(),
            findByIdForRefresh: jest.fn(),
            findByResetToken: jest.fn(),
            findByVerificationToken: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
            setPasswordReset: jest.fn(),
            setVerificationToken: jest.fn(),
            markAsVerified: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    eventEmitter = module.get(EventEmitter2);
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser());
      usersService.findById.mockResolvedValue(mockUser());
      usersService.updateRefreshToken.mockResolvedValue();
      usersService.setVerificationToken.mockResolvedValue();

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(usersService.create)).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email }),
      );
    });

    it('emits auth.registered event with verificationToken', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser());
      usersService.findById.mockResolvedValue(mockUser());
      usersService.updateRefreshToken.mockResolvedValue();
      usersService.setVerificationToken.mockResolvedValue();

      await service.register({
        email: 'a@b.com',
        password: 'pass1word',
        firstName: 'A',
        lastName: 'B',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'auth.registered',
        expect.objectContaining({
          email: 'test@example.com',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          verificationToken: expect.any(String),
        }),
      );
    });

    it('throws ConflictException if email already in use', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser());
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'pass1word',
          firstName: 'J',
          lastName: 'D',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const user = {
        ...mockUser(),
        password: await bcrypt.hash('password123', 10),
      };
      usersService.findByEmailForAuth.mockResolvedValue(user);
      usersService.updateRefreshToken.mockResolvedValue();

      const result = await service.login({
        email: user.email,
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException if user not found', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@email.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const user = {
        ...mockUser(),
        password: await bcrypt.hash('correct', 10),
      };
      usersService.findByEmailForAuth.mockResolvedValue(user);
      await expect(
        service.login({ email: user.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for Google-only account (no password)', async () => {
      const user = { ...mockUser(), password: null };
      usersService.findByEmailForAuth.mockResolvedValue(user);
      await expect(
        service.login({ email: user.email, password: 'anything' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ───────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('rotates tokens on valid refresh token', async () => {
      const rawToken = 'raw-refresh-token';
      const user = {
        ...mockUser(),
        refreshToken: await bcrypt.hash(rawToken, 10),
      };
      usersService.findByIdForRefresh.mockResolvedValue(user);
      usersService.updateRefreshToken.mockResolvedValue();

      const result = await service.refreshTokens(user.id, rawToken);

      expect(result).toHaveProperty('accessToken');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(jwtService.signAsync)).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedException if no stored refresh token', async () => {
      usersService.findByIdForRefresh.mockResolvedValue({
        ...mockUser(),
        refreshToken: null,
      });
      await expect(service.refreshTokens('user-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if refresh token does not match', async () => {
      const user = {
        ...mockUser(),
        refreshToken: await bcrypt.hash('correct-token', 10),
      };
      usersService.findByIdForRefresh.mockResolvedValue(user);
      await expect(
        service.refreshTokens('user-id', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears the refresh token', async () => {
      usersService.updateRefreshToken.mockResolvedValue();
      await service.logout('user-uuid');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(usersService.updateRefreshToken)).toHaveBeenCalledWith(
        'user-uuid',
        null,
      );
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marks user as verified with valid OTP', async () => {
      const user = {
        ...mockUser(),
        verificationTokenExpiry: new Date(Date.now() + 60000),
      };
      usersService.findByVerificationToken.mockResolvedValue(user);
      usersService.markAsVerified.mockResolvedValue();

      await service.verifyEmail('123456');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(usersService.markAsVerified)).toHaveBeenCalledWith(
        user.id,
      );
    });

    it('throws BadRequestException for invalid OTP', async () => {
      usersService.findByVerificationToken.mockResolvedValue(null);
      await expect(service.verifyEmail('000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for expired OTP', async () => {
      const user = {
        ...mockUser(),
        verificationTokenExpiry: new Date(Date.now() - 1000),
      };
      usersService.findByVerificationToken.mockResolvedValue(user);
      await expect(service.verifyEmail('123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if already verified', async () => {
      const user = {
        ...mockUser(),
        isVerified: true,
        verificationTokenExpiry: new Date(Date.now() + 60000),
      };
      usersService.findByVerificationToken.mockResolvedValue(user);
      await expect(service.verifyEmail('123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('updates password and clears refresh tokens', async () => {
      const user = {
        ...mockUser(),
        password: await bcrypt.hash('oldpass1', 10),
      };
      usersService.findByIdForAuth.mockResolvedValue(user);
      usersService.updatePassword.mockResolvedValue();
      usersService.updateRefreshToken.mockResolvedValue();

      await service.changePassword('user-uuid', 'oldpass1', 'newPass1');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(usersService.updateRefreshToken)).toHaveBeenCalledWith(
        'user-uuid',
        null,
      );
    });

    it('throws UnauthorizedException on wrong current password', async () => {
      const user = {
        ...mockUser(),
        password: await bcrypt.hash('correct1', 10),
      };
      usersService.findByIdForAuth.mockResolvedValue(user);
      await expect(
        service.changePassword('user-uuid', 'wrong', 'newPass1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException for Google-only account', async () => {
      usersService.findByIdForAuth.mockResolvedValue({
        ...mockUser(),
        password: null,
      });
      await expect(
        service.changePassword('user-uuid', 'anything', 'newPass1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── resetPassword ───────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);
      await expect(
        service.resetPassword('bad-token', 'newPass1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      const user = {
        ...mockUser(),
        passwordResetExpiry: new Date(Date.now() - 1000),
      };
      usersService.findByResetToken.mockResolvedValue(user);
      await expect(
        service.resetPassword('any-token', 'newPass1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and clears refresh tokens on valid token', async () => {
      const user = {
        ...mockUser(),
        passwordResetExpiry: new Date(Date.now() + 60000),
      };
      usersService.findByResetToken.mockResolvedValue(user);
      usersService.updatePassword.mockResolvedValue();
      usersService.updateRefreshToken.mockResolvedValue();

      await service.resetPassword('valid-token', 'newPass1');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(usersService.updateRefreshToken)).toHaveBeenCalledWith(
        user.id,
        null,
      );
    });
  });

  // ─── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('does nothing silently if email does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.forgotPassword('no@email.com'),
      ).resolves.toBeUndefined();
    });

    it('emits auth.forgotPassword event for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser());
      usersService.setPasswordReset.mockResolvedValue();

      await service.forgotPassword('test@example.com');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jest.mocked(eventEmitter.emit)).toHaveBeenCalledWith(
        'auth.forgotPassword',
        expect.objectContaining({
          email: 'test@example.com',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          token: expect.any(String),
        }),
      );
    });
  });
});
