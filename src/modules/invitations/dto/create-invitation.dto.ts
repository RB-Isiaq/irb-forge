import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

export class CreateInvitationDto {
  @ApiProperty({ example: 'newcomer@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiPropertyOptional({
    enum: [MembershipRole.ADMIN, MembershipRole.MENTOR, MembershipRole.MEMBER],
    default: MembershipRole.MEMBER,
    description: 'Role to assign. Cannot invite as owner.',
  })
  @IsOptional()
  @IsEnum(
    [MembershipRole.ADMIN, MembershipRole.MENTOR, MembershipRole.MEMBER],
    {
      message: 'Role must be admin, mentor, or member',
    },
  )
  role?: MembershipRole.ADMIN | MembershipRole.MENTOR | MembershipRole.MEMBER;
}
