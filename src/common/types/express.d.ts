import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Membership } from '../../modules/memberships/entities/membership.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      org?: Organization;
      membership?: Membership;
    }
  }
}
