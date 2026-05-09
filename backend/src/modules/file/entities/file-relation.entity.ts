import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { File } from './file.entity';

export type FileRelationEntityType = 'task' | 'comment';

@Entity('file_relations')
export class FileRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id' })
  fileId: string;

  @ManyToOne(() => File, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Column({ name: 'entity_type', length: 50 })
  entityType: FileRelationEntityType;

  @Column({ name: 'entity_id' })
  entityId: string;
}
