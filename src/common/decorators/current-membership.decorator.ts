import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Membership } from '../../modules/memberships/entities/membership.entity';

export const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Membership => {
    return ctx.switchToHttp().getRequest<{ membership: Membership }>()
      .membership;
  },
);
