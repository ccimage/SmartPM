import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectService } from './project.service';
import { AddProjectMemberDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // ── workspace-scoped ─────────────────────────────────────────────────────

  @Post('workspaces/:workspaceId/projects')
  create(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.create(workspaceId, userId, dto);
  }

  @Get('workspaces/:workspaceId/projects')
  listByWorkspace(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectService.listByWorkspace(workspaceId, userId);
  }

  // ── project-scoped ───────────────────────────────────────────────────────

  @Get('projects/:projectId')
  findOne(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
    return this.projectService.findOne(projectId, userId);
  }

  @Patch('projects/:projectId')
  update(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(projectId, userId, dto);
  }

  @Delete('projects/:projectId')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
    return this.projectService.remove(projectId, userId);
  }

  @Get('projects/:projectId/members')
  listMembers(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
    return this.projectService.listMembers(projectId, userId);
  }

  @Post('projects/:projectId/members')
  addMember(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectService.addMember(projectId, userId, dto);
  }

  @Delete('projects/:projectId/members/:memberId')
  @HttpCode(204)
  removeMember(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectService.removeMember(projectId, userId, memberId);
  }
}
