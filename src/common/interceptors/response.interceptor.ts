import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../types/api-response.types';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const statusCode = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>().statusCode;

    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      null;

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        statusCode,
        data,
        message,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
