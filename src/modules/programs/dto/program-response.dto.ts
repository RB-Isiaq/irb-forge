import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramStatus } from '../enums/program-status.enum';

export class ProgramResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  createdById: string | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: ProgramStatus })
  status: ProgramStatus;

  @ApiPropertyOptional()
  capacity: number | null;

  @ApiPropertyOptional()
  startDate: Date | null;

  @ApiPropertyOptional()
  endDate: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
