import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'Welcome to the new cohort! Kickoff is June 1st.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
