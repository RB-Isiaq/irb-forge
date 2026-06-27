import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChannelMemberUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;
}

export class ChannelMemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  joinedAt!: Date;

  @ApiPropertyOptional({ type: ChannelMemberUserDto })
  user?: ChannelMemberUserDto;
}
