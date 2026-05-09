import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import { ListActivitiesQueryDto } from './dto/activity.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('projects/:projectId/activities')
  listByProject(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Query() query: ListActivitiesQueryDto,
  ) {
    return this.activityService.listByProject(projectId, userId, query);
  }

  @Get('tasks/:taskId/activities')
  listByTask(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Query() query: ListActivitiesQueryDto,
  ) {
    return this.activityService.listByTask(taskId, userId, query);
  }
}
