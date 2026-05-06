import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TaskService } from './task.service';
import {
  CreateTagDto,
  CreateTaskDto,
  ListTasksQueryDto,
  SetTaskTagsDto,
  UpdateTaskDto,
} from './dto/task.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('projects/:projectId/tasks')
  create(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.create(projectId, userId, dto);
  }

  @Get('projects/:projectId/tasks')
  list(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.taskService.list(projectId, userId, query);
  }

  @Get('tasks/:taskId')
  findOne(@CurrentUser() userId: string, @Param('taskId') taskId: string) {
    return this.taskService.findOne(taskId, userId);
  }

  @Patch('tasks/:taskId')
  update(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(taskId, userId, dto);
  }

  @Delete('tasks/:taskId')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('taskId') taskId: string) {
    return this.taskService.remove(taskId, userId);
  }

  @Get('tasks/:taskId/subtasks')
  listSubtasks(@CurrentUser() userId: string, @Param('taskId') taskId: string) {
    return this.taskService.listSubtasks(taskId, userId);
  }

  @Get('projects/:projectId/tags')
  listTags(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
    return this.taskService.listTags(projectId, userId);
  }

  @Post('projects/:projectId/tags')
  createTag(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.taskService.createTag(projectId, userId, dto);
  }

  @Put('tasks/:taskId/tags')
  setTaskTags(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: SetTaskTagsDto,
  ) {
    return this.taskService.setTaskTags(taskId, userId, dto);
  }
}
