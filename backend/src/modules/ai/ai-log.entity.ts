import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';

export type AiLogType = 'generate_tasks' | 'split_requirement' | 'daily_summary';
export type AiLogStatus = 'pending' | 'processing' | 'done' | 'failed';

@Entity('ai_logs')
export class AiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ length: 50 })
  type: string;

  @Column({ name: 'input_text', type: 'text', nullable: true })
  inputText: string | null;

  @Column({ name: 'output_text', type: 'text', nullable: true })
  outputText: string | null;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
