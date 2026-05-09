import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../enums/membership-role.enum';

export class UpdateRoleDto {
  @ApiProperty({
    enum: [MembershipRole.ADMIN, MembershipRole.MENTOR, MembershipRole.MEMBER],
    description: 'Role to assign. Cannot set owner via this endpoint.',
  })
  @IsEnum(
    [MembershipRole.ADMIN, MembershipRole.MENTOR, MembershipRole.MEMBER],
    {
      message: 'Role must be admin, mentor, or member',
    },
  )
  role!: MembershipRole.ADMIN | MembershipRole.MENTOR | MembershipRole.MEMBER;
}
