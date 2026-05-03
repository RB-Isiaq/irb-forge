import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';

// ─── Error schema ────────────────────────────────────────────────────────────

export class ApiErrorDetailDto {
  @ApiProperty({ required: false, example: 'email' })
  field?: string;

  @ApiProperty({ example: 'email must be an email' })
  message!: string;
}

class ApiErrorBodyDto {
  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ type: [ApiErrorDetailDto] })
  details!: ApiErrorDetailDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto;

  @ApiProperty({ example: '/api/auth/login' })
  path!: string;

  @ApiProperty({ example: '2026-05-02T22:00:00.000Z' })
  timestamp!: string;
}

// ─── Success response factory ─────────────────────────────────────────────────

export function WrappedResponse<T>(DataType: Type<T>) {
  class WrappedDto {
    @ApiProperty({ example: true })
    success!: true;

    @ApiProperty({ example: 200 })
    statusCode!: number;

    @ApiProperty({ type: () => DataType })
    data!: T;

    @ApiProperty({ example: null, nullable: true, type: String })
    message!: string | null;

    @ApiProperty({ example: '2026-05-02T22:00:00.000Z' })
    timestamp!: string;
  }

  Object.defineProperty(WrappedDto, 'name', {
    value: `${DataType.name}Response`,
  });

  return WrappedDto;
}

export function WrappedArrayResponse<T>(DataType: Type<T>) {
  class PaginatedMetaDto {
    @ApiProperty({ example: 100 })
    total!: number;

    @ApiProperty({ example: 1 })
    page!: number;

    @ApiProperty({ example: 20 })
    limit!: number;

    @ApiProperty({ example: 5 })
    totalPages!: number;
  }

  class WrappedPaginatedDto {
    @ApiProperty({ example: true })
    success!: true;

    @ApiProperty({ example: 200 })
    statusCode!: number;

    @ApiProperty({ type: [DataType] })
    data!: T[];

    @ApiProperty({ example: null, nullable: true, type: String })
    message!: string | null;

    @ApiProperty({ type: PaginatedMetaDto })
    meta!: PaginatedMetaDto;

    @ApiProperty({ example: '2026-05-02T22:00:00.000Z' })
    timestamp!: string;
  }

  Object.defineProperty(WrappedPaginatedDto, 'name', {
    value: `Paginated${DataType.name}Response`,
  });

  return WrappedPaginatedDto;
}

// ─── Reusable decorators ──────────────────────────────────────────────────────

export const ApiOkWrappedResponse = <T>(DataType: Type<T>) =>
  applyDecorators(ApiOkResponse({ type: WrappedResponse(DataType) }));

export const ApiCreatedWrappedResponse = <T>(DataType: Type<T>) =>
  applyDecorators(ApiCreatedResponse({ type: WrappedResponse(DataType) }));

export const ApiOkPaginatedResponse = <T>(DataType: Type<T>) =>
  applyDecorators(ApiOkResponse({ type: WrappedArrayResponse(DataType) }));

export const ApiBadRequestWrappedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 400,
      type: ApiErrorResponseDto,
      description: 'Validation failed',
    }),
  );

export const ApiUnauthorizedWrappedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 401,
      type: ApiErrorResponseDto,
      description: 'Unauthorized',
    }),
  );

export const ApiForbiddenWrappedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 403,
      type: ApiErrorResponseDto,
      description: 'Forbidden',
    }),
  );

export const ApiNotFoundWrappedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 404,
      type: ApiErrorResponseDto,
      description: 'Not found',
    }),
  );

export const ApiConflictWrappedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 409,
      type: ApiErrorResponseDto,
      description: 'Conflict',
    }),
  );
