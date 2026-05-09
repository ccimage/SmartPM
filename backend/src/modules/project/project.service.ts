import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { ProjectMember } from './project-member.entity';
import { WorkspaceService } from '../workspace/workspace.service';
import { AddProjectMemberDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    await this.workspaceService.requireMember(workspaceId, userId);
    const project = await this.projectRepo.save(
      this.projectRepo.create({ workspaceId, name: dto.name, description: dto.description ?? null, createdBy: userId }),
    );
    await this.memberRepo.save(
      this.memberRepo.create({ projectId: project.id, userId, role: 'admin' }),
    );
    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
    };
  }

  async listByWorkspace(workspaceId: string, userId: string) {
    await this.workspaceService.requireMember(workspaceId, userId);
    const projects = await this.projectRepo.find({ where: { workspaceId } });
    return Promise.all(
      projects.map(async (p) => {
        const memberCount = await this.memberRepo.count({ where: { projectId: p.id } });
        return { id: p.id, name: p.name, description: p.description, memberCount, createdAt: p.createdAt };
      }),
    );
  }

  async findOne(projectId: string, userId: string) {
    await this.requireProjectMember(projectId, userId);
    const p = await this.projectRepo.findOneOrFail({ where: { id: projectId } });
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      name: p.name,
      description: p.description,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.requireProjectRole(projectId, userId, ['admin']);
    await this.projectRepo.update(projectId, dto);
    const p = await this.projectRepo.findOneOrFail({ where: { id: projectId } });
    return { id: p.id, name: p.name, updatedAt: p.updatedAt };
  }

  async remove(projectId: string, userId: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    const isProjectAdmin = member?.role === 'admin';

    if (!isProjectAdmin) {
      const project = await this.projectRepo.findOne({ where: { id: projectId } });
      if (!project) throw new NotFoundException('Project not found');
      await this.workspaceService.requireRole(project.workspaceId, userId, ['owner']);
    }

    await this.projectRepo.softDelete(projectId);
  }

  async listMembers(projectId: string, userId: string) {
    await this.requireProjectMember(projectId, userId);
    const members = await this.memberRepo.find({ where: { projectId }, relations: ['user'] });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));
  }

  async addMember(projectId: string, userId: string, dto: AddProjectMemberDto) {
    await this.requireProjectRole(projectId, userId, ['admin']);
    const existing = await this.memberRepo.findOne({ where: { projectId, userId: dto.userId } });
    if (existing) throw new BadRequestException('User is already a project member');
    const member = await this.memberRepo.save(
      this.memberRepo.create({ projectId, userId: dto.userId, role: dto.role }),
    );
    return { id: member.id, userId: member.userId, role: member.role };
  }

  async removeMember(projectId: string, userId: string, memberId: string) {
    await this.requireProjectRole(projectId, userId, ['admin']);
    const member = await this.memberRepo.findOne({ where: { id: memberId, projectId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.memberRepo.delete(memberId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  async requireProjectMember(projectId: string, userId: string): Promise<ProjectMember> {
    const m = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!m) throw new ForbiddenException('Not a member of this project');
    return m;
  }

  async requireProjectRole(projectId: string, userId: string, roles: string[]): Promise<ProjectMember> {
    const m = await this.requireProjectMember(projectId, userId);
    if (!roles.includes(m.role)) throw new ForbiddenException('Insufficient permissions');
    return m;
  }

  async getProjectWorkspaceId(projectId: string): Promise<string> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return project.workspaceId;
  }
}
