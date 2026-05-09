import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './activity-log.entity';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityPublisherService } from './activity-publisher.service';
import { TaskModule } from '../task/task.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog]), forwardRef(() => TaskModule), ProjectModule],
  providers: [ActivityService, ActivityPublisherService],
  controllers: [ActivityController],
  exports: [ActivityService, ActivityPublisherService],
})
export class ActivityModule {}
