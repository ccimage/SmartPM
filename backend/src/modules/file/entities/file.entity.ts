import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 1000 })
  url: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1000, nullable: true })
  storageKey: string | null;

  @Column({ length: 500 })
  filename: string;

  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
