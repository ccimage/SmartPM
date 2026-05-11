import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserPreference } from './user-preference.entity';
import { File } from '../file/entities/file.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepo: Repository<UserPreference>,
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      const password = this.generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      await this.repo.save(
        this.repo.create({
          email: 'admin@smartpm.com',
          passwordHash,
          name: 'Admin',
        }),
      );
      console.log('========================================');
      console.log('Admin account created:');
      console.log('  Email:    admin@smartpm.com');
      console.log(`  Password: ${password}`);
      console.log('========================================');
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findPreferencesByUserId(userId: string): Promise<UserPreference | null> {
    return this.preferenceRepo.findOne({ where: { userId } });
  }

  create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async updateMe(id: string, data: { name?: string; avatarUrl?: string }): Promise<User> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.update(user.id, { passwordHash });
  }

  async getProfile(userId: string) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const preferences = await this.findPreferencesByUserId(userId);
    return user.toProfile(preferences);
  }

  async getPreferences(userId: string) {
    const preferences = await this.preferenceRepo.findOne({ where: { userId } });
    return (
      preferences?.toProfile() ?? {
        themeColor: null,
        backgroundImageUrl: null,
        backgroundOverlay: 'medium',
        useSystemTheme: false,
      }
    );
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    let backgroundImageUrl: string | null | undefined;

    if (dto.backgroundImageFileId !== undefined) {
      if (dto.backgroundImageFileId === null) {
        backgroundImageUrl = null;
      } else {
        const file = await this.fileRepo.findOne({ where: { id: dto.backgroundImageFileId } });
        if (!file || file.uploadedBy !== userId) {
          throw new UnauthorizedException('Background image file is not available');
        }
        backgroundImageUrl = file.url;
      }
    }

    const preference = await this.preferenceRepo.save(
      this.preferenceRepo.create({
        userId,
        ...(dto.themeColor !== undefined ? { themeColor: dto.themeColor } : {}),
        ...(dto.backgroundImageFileId !== undefined
          ? {
              backgroundImageFileId: dto.backgroundImageFileId,
              backgroundImageUrl,
            }
          : {}),
        ...(dto.backgroundOverlay !== undefined
          ? { backgroundOverlay: dto.backgroundOverlay }
          : {}),
        ...(dto.useSystemTheme !== undefined ? { useSystemTheme: dto.useSystemTheme } : {}),
      }),
    );

    return preference.toProfile();
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      '',
    );
  }
}
