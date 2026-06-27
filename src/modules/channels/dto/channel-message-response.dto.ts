import { ApiProperty } from '@nestjs/swagger';

export class ChannelMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  channelId: string;

  @ApiProperty({ nullable: true })
  authorId: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
