import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailForAuth(email);
  }

  findByIdForAuth(id: string): Promise<User | null> {
    return this.usersRepository.findByIdForAuth(id);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findByGoogleId(googleId);
  }

  linkGoogleId(id: string, googleId: string): Promise<void> {
    return this.usersRepository.linkGoogleId(id, googleId);
  }

  findByIdForRefresh(id: string): Promise<User | null> {
    return this.usersRepository.findByIdForRefresh(id);
  }

  findByVerificationToken(tokenHash: string): Promise<User | null> {
    return this.usersRepository.findByVerificationToken(tokenHash);
  }

  setVerificationToken(
    id: string,
    tokenHash: string,
    expiry: Date,
  ): Promise<void> {
    return this.usersRepository.setVerificationToken(id, tokenHash, expiry);
  }

  markAsVerified(id: string): Promise<void> {
    return this.usersRepository.markAsVerified(id);
  }

  findByResetToken(tokenHash: string): Promise<User | null> {
    return this.usersRepository.findByResetToken(tokenHash);
  }

  create(data: Partial<User>): Promise<User> {
    return this.usersRepository.create(data);
  }

  updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    return this.usersRepository.update(id, dto);
  }

  updateRefreshToken(id: string, hash: string | null): Promise<void> {
    return this.usersRepository.updateRefreshToken(id, hash);
  }

  setPasswordReset(id: string, tokenHash: string, expiry: Date): Promise<void> {
    return this.usersRepository.setPasswordReset(id, tokenHash, expiry);
  }

  updatePassword(id: string, hashedPassword: string): Promise<void> {
    return this.usersRepository.updatePassword(id, hashedPassword);
  }
}
