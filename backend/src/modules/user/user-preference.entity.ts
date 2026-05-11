import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { File } from '../file/entities/file.entity';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'theme_color', type: 'varchar', length: 20, nullable: true })
  themeColor: string | null;

  @Column({ name: 'background_image_file_id', type: 'uuid', nullable: true })
  backgroundImageFileId: string | null;

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'background_image_file_id' })
  backgroundImageFile: File | null;

  @Column({ name: 'background_image_url', type: 'varchar', length: 1000, nullable: true })
  backgroundImageUrl: string | null;

  @Column({ name: 'background_overlay', type: 'varchar', length: 20, default: 'medium' })
  backgroundOverlay: string;

  @Column({ name: 'use_system_theme', type: 'boolean', default: false })
  useSystemTheme: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  toProfile() {
    return {
      themeColor: this.themeColor,
      backgroundImageUrl: this.backgroundImageUrl,
      backgroundOverlay: this.backgroundOverlay,
      useSystemTheme: this.useSystemTheme,
    };
  }
}
