import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  toProfile() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt,
    };
  }
}
