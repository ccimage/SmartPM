import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { FileRelation } from './entities/file-relation.entity';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { TaskModule } from '../task/task.module';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([File, FileRelation]), TaskModule, ProjectModule, UserModule],
  providers: [FileService],
  controllers: [FileController],
})
export class FileModule {}
