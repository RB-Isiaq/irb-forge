import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddChannelMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
