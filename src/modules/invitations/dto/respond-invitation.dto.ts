import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondInvitationDto {
  @ApiProperty({ description: 'The invitation token from the email link' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
