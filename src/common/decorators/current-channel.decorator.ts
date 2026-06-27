import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Channel } from '../../modules/channels/entities/channel.entity';

export const CurrentChannel = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Channel => {
    const request = ctx.switchToHttp().getRequest<{ channel: Channel }>();
    return request.channel;
  },
);
