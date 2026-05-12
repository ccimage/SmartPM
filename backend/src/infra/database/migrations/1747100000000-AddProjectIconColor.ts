import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIconColor1747100000000 implements MigrationInterface {
  name = 'AddProjectIconColor1747100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN icon  VARCHAR(60)  NOT NULL DEFAULT 'code',
        ADD COLUMN color VARCHAR(20)  NOT NULL DEFAULT '#4f46e5'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS icon,
        DROP COLUMN IF EXISTS color
    `);
  }
}
