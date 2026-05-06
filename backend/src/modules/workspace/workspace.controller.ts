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
import { WorkspaceService } from './workspace.service';
import {
  CreateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(userId, dto);
  }

  @Get()
  listMine(@CurrentUser() userId: string) {
    return this.workspaceService.listMine(userId);
  }

  @Get(':workspaceId')
  findOne(@CurrentUser() userId: string, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.findOne(workspaceId, userId);
  }

  @Patch(':workspaceId')
  update(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.update(workspaceId, userId, dto);
  }

  @Get(':workspaceId/members')
  listMembers(@CurrentUser() userId: string, @Param('workspaceId') workspaceId: string) {
    return this.workspaceService.listMembers(workspaceId, userId);
  }

  @Post(':workspaceId/members')
  inviteMember(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.inviteMember(workspaceId, userId, dto);
  }

  @Patch(':workspaceId/members/:memberId')
  updateMemberRole(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(workspaceId, userId, memberId, dto);
  }

  @Delete(':workspaceId/members/:memberId')
  @HttpCode(204)
  removeMember(
    @CurrentUser() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspaceService.removeMember(workspaceId, userId, memberId);
  }
}
