import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Organization } from '../../modules/organizations/entities/organization.entity';

export const CurrentOrg = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Organization => {
    const request = ctx.switchToHttp().getRequest<{ org: Organization }>();
    return request.org;
  },
);
