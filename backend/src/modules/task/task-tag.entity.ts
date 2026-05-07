import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { Task } from './task.entity';

@Entity('task_tags')
export class TaskTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @ManyToMany(() => Task, (task) => task.tags)
  tasks: Task[];
}
