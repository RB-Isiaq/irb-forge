import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from the frontend Google SDK' })
  @IsString()
  idToken!: string;
}
