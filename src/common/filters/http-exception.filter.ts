import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorDetail, ApiErrorResponse } from '../types/api-response.types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message, details } = this.extractError(exception, statusCode);

    this.logger.error(
      `${request.method} ${request.url} — ${statusCode}`,
      exception instanceof Error ? exception.stack : '',
    );

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      error: { code, message, details },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private extractError(
    exception: unknown,
    statusCode: number,
  ): { code: string; message: string; details: ApiErrorDetail[] } {
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: [],
      };
    }

    const nestResponse = exception.getResponse();
    const code = this.statusToCode(statusCode);

    // NestJS ValidationPipe returns { message: string[], error: string }
    if (
      typeof nestResponse === 'object' &&
      nestResponse !== null &&
      'message' in nestResponse
    ) {
      const nested = nestResponse as {
        message: string | string[];
        error?: string;
      };
      const rawMessages = Array.isArray(nested.message)
        ? nested.message
        : [nested.message];

      const details: ApiErrorDetail[] = rawMessages.map((msg) => ({
        message: msg,
      }));

      return {
        code,
        message: Array.isArray(nested.message)
          ? 'Validation failed'
          : nested.message,
        details,
      };
    }

    return {
      code,
      message:
        typeof nestResponse === 'string' ? nestResponse : exception.message,
      details: [],
    };
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
