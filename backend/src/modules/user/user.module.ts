import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserPreference } from './user-preference.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { File } from '../file/entities/file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreference, File])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
