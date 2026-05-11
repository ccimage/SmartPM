import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1747040400000 implements MigrationInterface {
  name = 'AddUserPreferences1747040400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme_color VARCHAR(20),
        background_image_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
        background_image_url VARCHAR(1000),
        background_overlay VARCHAR(20) NOT NULL DEFAULT 'medium',
        use_system_theme BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_preferences_background_image_file
      ON user_preferences(background_image_file_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_preferences`);
  }
}
