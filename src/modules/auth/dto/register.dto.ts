import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 8,
    description: 'Must contain at least one letter and one number',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number',
  })
  password!: string;

  @ApiProperty({ example: 'John' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;
}
