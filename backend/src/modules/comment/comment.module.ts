import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TaskModule } from '../task/task.module';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), TaskModule, ProjectModule, UserModule, ActivityModule],
  providers: [CommentService],
  controllers: [CommentController],
})
export class CommentModule {}
