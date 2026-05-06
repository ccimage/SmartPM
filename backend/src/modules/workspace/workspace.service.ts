import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { UserService } from '../user/user.service';
import {
  CreateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await this.workspaceRepo.save(
      this.workspaceRepo.create({ name: dto.name, ownerId: userId }),
    );
    await this.memberRepo.save(
      this.memberRepo.create({ workspaceId: workspace.id, userId, role: 'owner' }),
    );
    return { id: workspace.id, name: workspace.name, ownerId: workspace.ownerId, createdAt: workspace.createdAt };
  }

  async listMine(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
    });
    const results = await Promise.all(
      memberships.map(async (m) => {
        const memberCount = await this.memberRepo.count({ where: { workspaceId: m.workspaceId } });
        return { id: m.workspaceId, name: m.workspace.name, role: m.role, memberCount };
      }),
    );
    return results;
  }

  async findOne(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    const w = await this.workspaceRepo.findOneOrFail({ where: { id: workspaceId } });
    return { id: w.id, name: w.name, ownerId: w.ownerId, createdAt: w.createdAt };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.requireRole(workspaceId, userId, ['owner', 'admin']);
    await this.workspaceRepo.update(workspaceId, { name: dto.name });
    const w = await this.workspaceRepo.findOneOrFail({ where: { id: workspaceId } });
    return { id: w.id, name: w.name, updatedAt: w.updatedAt };
  }

  async listMembers(workspaceId: string, userId: string) {
    await this.requireMember(workspaceId, userId);
    const members = await this.memberRepo.find({
      where: { workspaceId },
      relations: ['user'],
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async inviteMember(workspaceId: string, userId: string, dto: InviteMemberDto) {
    await this.requireRole(workspaceId, userId, ['owner', 'admin']);
    const target = await this.userService.findByEmail(dto.email);
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.memberRepo.findOne({ where: { workspaceId, userId: target.id } });
    if (existing) throw new BadRequestException('User is already a member');

    const member = await this.memberRepo.save(
      this.memberRepo.create({ workspaceId, userId: target.id, role: dto.role }),
    );
    return { id: member.id, userId: member.userId, role: member.role };
  }

  async updateMemberRole(workspaceId: string, userId: string, memberId: string, dto: UpdateMemberRoleDto) {
    await this.requireRole(workspaceId, userId, ['owner']);
    const member = await this.memberRepo.findOne({ where: { id: memberId, workspaceId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') throw new ForbiddenException('Cannot change owner role');

    await this.memberRepo.update(memberId, { role: dto.role });
    return { id: memberId, role: dto.role };
  }

  async removeMember(workspaceId: string, userId: string, memberId: string) {
    await this.requireRole(workspaceId, userId, ['owner', 'admin']);
    const member = await this.memberRepo.findOne({ where: { id: memberId, workspaceId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') throw new ForbiddenException('Cannot remove owner');
    await this.memberRepo.delete(memberId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  async requireMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const m = await this.memberRepo.findOne({ where: { workspaceId, userId } });
    if (!m) throw new ForbiddenException('Not a member of this workspace');
    return m;
  }

  async requireRole(workspaceId: string, userId: string, roles: string[]): Promise<WorkspaceMember> {
    const m = await this.requireMember(workspaceId, userId);
    if (!roles.includes(m.role)) throw new ForbiddenException('Insufficient permissions');
    return m;
  }
}
