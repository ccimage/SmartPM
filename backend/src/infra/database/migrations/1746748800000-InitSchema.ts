import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1746748800000 implements MigrationInterface {
  name = 'InitSchema1746748800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (workspace_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (project_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'todo',
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
        creator_id UUID NOT NULL REFERENCES users(id),
        due_date DATE,
        extra JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE task_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20),
        UNIQUE (project_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE task_tag_rel (
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        extra JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url VARCHAR(1000) NOT NULL,
        storage_key VARCHAR(1000),
        filename VARCHAR(500) NOT NULL,
        size BIGINT,
        mime_type VARCHAR(100),
        uploaded_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE file_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        extra JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ai_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        input_text TEXT,
        output_text TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        extra JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        extra JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(
      `CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_workspace_members_user ON workspace_members(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_projects_workspace ON projects(workspace_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_project_members_project ON project_members(project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_project_members_user ON project_members(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_parent ON tasks(parent_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_status ON tasks(project_id, status) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_comments_task ON comments(task_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_project ON activity_logs(project_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ai_logs_status ON ai_logs(status) WHERE status IN ('pending', 'processing')`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ai_logs_user ON ai_logs(user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_file_relations_entity ON file_relations(entity_type, entity_id)`,
    );
    await queryRunner.query(`CREATE INDEX idx_task_tag_rel_tag ON task_tag_rel(tag_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS activity_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS file_relations`);
    await queryRunner.query(`DROP TABLE IF EXISTS files`);
    await queryRunner.query(`DROP TABLE IF EXISTS comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_tag_rel`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_tags`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspaces`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
