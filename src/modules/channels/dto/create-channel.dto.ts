import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty({ example: 'cohort-2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
