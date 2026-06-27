import { ApiProperty } from '@nestjs/swagger';

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({
    nullable: true,
    description:
      'Pass as `before` on the next request to load older items. Null when there are none left.',
  })
  nextCursor: string | null;

  constructor(items: T[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}
