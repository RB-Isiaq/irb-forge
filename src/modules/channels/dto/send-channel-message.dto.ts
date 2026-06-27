import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChannelMessageDto {
  @ApiProperty({ example: 'Welcome to the channel!' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
