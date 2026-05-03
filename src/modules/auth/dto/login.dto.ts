import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
