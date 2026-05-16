import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from '../services/payments.service';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks')
export class WebhookHandler {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver — do not call directly' })
  handleStripe(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<void> {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
