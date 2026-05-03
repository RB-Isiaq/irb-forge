import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  @IsEmail()
  email!: string;
}
