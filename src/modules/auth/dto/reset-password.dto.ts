import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

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
}
