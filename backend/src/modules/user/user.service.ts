import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async updateMe(id: string, data: { name?: string; avatarUrl?: string }): Promise<User> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }
}
