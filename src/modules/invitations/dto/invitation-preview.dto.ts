import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '../../memberships/enums/membership-role.enum';

class PreviewOrgDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}

class PreviewInviterDto {
  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;
}

export class InvitationPreviewDto {
  @ApiProperty({ type: PreviewOrgDto })
  organization!: PreviewOrgDto;

  @ApiProperty({ type: PreviewInviterDto })
  invitedBy!: PreviewInviterDto;

  @ApiProperty({ enum: MembershipRole })
  role!: MembershipRole;

  @ApiProperty()
  expiresAt!: Date;
}
