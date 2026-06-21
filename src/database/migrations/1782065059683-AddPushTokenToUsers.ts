import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushTokenToUsers1782065059683 implements MigrationInterface {
  name = 'AddPushTokenToUsers1782065059683';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "pushToken" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pushToken"`);
  }
}
