import { ApiProperty } from '@nestjs/swagger';

export class ChannelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ nullable: true })
  createdById: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
