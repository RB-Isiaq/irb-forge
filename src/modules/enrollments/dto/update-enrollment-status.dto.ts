import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class UpdateEnrollmentStatusDto {
  @ApiProperty({ enum: [EnrollmentStatus.COMPLETED, EnrollmentStatus.DROPPED] })
  @IsEnum([EnrollmentStatus.COMPLETED, EnrollmentStatus.DROPPED], {
    message: 'status must be completed or dropped',
  })
  status: EnrollmentStatus.COMPLETED | EnrollmentStatus.DROPPED;
}
