import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChannels1782562598686 implements MigrationInterface {
  name = 'CreateChannels1782562598686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "channels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "name" character varying(50) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdById" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_803ad4ae35c7c741ffd2681be93" UNIQUE ("organizationId", "name"), CONSTRAINT "PK_bc603823f3f741359c2339389f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "channel_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channelId" uuid NOT NULL, "authorId" uuid, "content" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_78c08df85633e14659b3bfcd3b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e46fa6635be01a4fba56dd98c4" ON "channel_messages" ("channelId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "channel_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channelId" uuid NOT NULL, "organizationId" uuid NOT NULL, "userId" uuid NOT NULL, "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f21aaa9a3ea3b8c45a686a8b4f0" UNIQUE ("channelId", "userId"), CONSTRAINT "PK_95976b619edca48aed364c70c36" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db73d12c31aa45d249f6efeaa0" ON "channel_members" ("channelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b497f2fef3c4a62173cdb6728e" ON "channel_members" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "FK_37d569bc041e83d34b4660d4077" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "FK_be764a77b8e0ffc39f8816317d8" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_messages" ADD CONSTRAINT "FK_3d76c24eff9881b6f0ecd49f743" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_messages" ADD CONSTRAINT "FK_a5cb766ac191d7f1af3ab09ae80" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_members" ADD CONSTRAINT "FK_db73d12c31aa45d249f6efeaa01" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_members" ADD CONSTRAINT "FK_55481dacccadee79a9056e4e529" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_members" ADD CONSTRAINT "FK_b497f2fef3c4a62173cdb6728ef" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Backfill: every existing org gets a "general" default channel, and every
    // existing member is auto-joined to it, so nobody loses access when this ships.
    await queryRunner.query(
      `INSERT INTO "channels" ("organizationId", "name", "isDefault", "createdById") SELECT "id", 'general', true, "ownerId" FROM "organizations"`,
    );
    await queryRunner.query(
      `INSERT INTO "channel_members" ("channelId", "organizationId", "userId") SELECT c."id", c."organizationId", m."userId" FROM "channels" c JOIN "memberships" m ON m."organizationId" = c."organizationId" WHERE c."isDefault" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel_members" DROP CONSTRAINT "FK_b497f2fef3c4a62173cdb6728ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_members" DROP CONSTRAINT "FK_55481dacccadee79a9056e4e529"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_members" DROP CONSTRAINT "FK_db73d12c31aa45d249f6efeaa01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_messages" DROP CONSTRAINT "FK_a5cb766ac191d7f1af3ab09ae80"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel_messages" DROP CONSTRAINT "FK_3d76c24eff9881b6f0ecd49f743"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" DROP CONSTRAINT "FK_be764a77b8e0ffc39f8816317d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" DROP CONSTRAINT "FK_37d569bc041e83d34b4660d4077"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b497f2fef3c4a62173cdb6728e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db73d12c31aa45d249f6efeaa0"`,
    );
    await queryRunner.query(`DROP TABLE "channel_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e46fa6635be01a4fba56dd98c4"`,
    );
    await queryRunner.query(`DROP TABLE "channel_messages"`);
    await queryRunner.query(`DROP TABLE "channels"`);
  }
}
