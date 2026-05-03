import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { StringValue } from 'ms';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.googleClient = new OAuth2Client(
      config.getOrThrow<string>('google.clientId'),
    );
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashed,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const verificationToken = await this.generateVerificationToken(user.id);
    this.eventEmitter.emit('auth.registered', {
      userId: user.id,
      email: user.email,
      verificationToken,
    });

    // Reload via SELECT so select:false fields are excluded from the response
    const safeUser = await this.usersService.findById(user.id);
    return { user: safeUser, ...tokens };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) throw new UnauthorizedException();

    if (!user.password)
      throw new BadRequestException(
        'This account uses Google Sign-In. Use forgot-password to set a password.',
      );

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      throw new UnauthorizedException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
    // Invalidate all refresh tokens so other sessions must re-login
    await this.usersService.updateRefreshToken(userId, null);
  }

  async verifyEmail(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.usersService.findByVerificationToken(tokenHash);
    if (!user)
      throw new BadRequestException('Invalid or expired verification token');

    const expired =
      !user.verificationTokenExpiry ||
      user.verificationTokenExpiry < new Date();
    if (expired)
      throw new BadRequestException('Invalid or expired verification token');

    if (user.isVerified)
      throw new BadRequestException('Email already verified');

    await this.usersService.markAsVerified(user.id);
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Generic response — don't reveal whether email exists
    if (!user || user.isVerified) return;

    const verificationToken = await this.generateVerificationToken(user.id);
    this.eventEmitter.emit('auth.verificationResent', {
      email: user.email,
      verificationToken,
    });
  }

  async googleSignIn(idToken: string) {
    let email: string;
    let firstName: string | null;
    let lastName: string | null;
    let googleId: string;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.getOrThrow<string>('google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub)
        throw new Error('Missing required fields');

      email = payload.email;
      firstName = payload.given_name ?? null;
      lastName = payload.family_name ?? null;
      googleId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find by googleId first (returning user)
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      const existing = await this.usersService.findByEmail(email);

      if (existing) {
        // Link Google to an existing email/password account
        await this.usersService.linkGoogleId(existing.id, googleId);
        user = await this.usersService.findById(existing.id);
      } else {
        // New user — no password, already verified via Google
        user = await this.usersService.create({
          email,
          firstName,
          lastName,
          googleId,
          isVerified: true,
        });
        this.eventEmitter.emit('auth.googleRegistered', {
          userId: user.id,
          email: user.email,
        });
        user = await this.usersService.findById(user.id);
      }
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailForAuth(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Google-only accounts have no password
    if (!user.password) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(userId: string, rawRefreshToken: string) {
    const user = await this.usersService.findByIdForRefresh(userId);
    if (!user?.refreshToken) throw new UnauthorizedException('Access denied');

    const tokenMatch = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!tokenMatch) throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Return generic response regardless — don't reveal whether email exists
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.usersService.setPasswordReset(user.id, tokenHash, expiry);

    this.eventEmitter.emit('auth.forgotPassword', { email, token: rawToken });
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.usersService.findByResetToken(tokenHash);
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const expired =
      !user.passwordResetExpiry || user.passwordResetExpiry < new Date();
    if (expired)
      throw new BadRequestException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    await this.usersService.updateRefreshToken(user.id, null);
  }

  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: this.config.getOrThrow<string>(
          'jwt.expiresIn',
        ) as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.getOrThrow<string>(
          'jwt.refreshExpiresIn',
        ) as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateVerificationToken(userId: string): Promise<string> {
    const otp = crypto.randomInt(100000, 1000000).toString(); // 6-digit OTP
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.usersService.setVerificationToken(userId, tokenHash, expiry);
    return otp;
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(rawToken, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }
}
