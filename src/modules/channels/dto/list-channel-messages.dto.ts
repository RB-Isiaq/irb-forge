import { IsOptional, IsISO8601, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListChannelMessagesDto {
  @ApiPropertyOptional({
    description: 'ISO timestamp — return messages older than this',
  })
  @IsOptional()
  @IsISO8601()
  before?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
