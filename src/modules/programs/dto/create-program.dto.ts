import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramStatus } from '../enums/program-status.enum';

export class CreateProgramDto {
  @ApiProperty({ example: 'Backend Engineering Bootcamp' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'A 12-week cohort for aspiring backend engineers.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProgramStatus, default: ProgramStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
