import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sanitizeHtml from 'sanitize-html';
import { IsNull, Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskTag } from './task-tag.entity';
import { ProjectService } from '../project/project.service';
import { ActivityPublisherService } from '../activity/activity-publisher.service';
import {
  CreateTagDto,
  CreateTaskDto,
  ListTasksQueryDto,
  SetTaskTagsDto,
  UpdateTaskDto,
} from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskTag)
    private readonly tagRepo: Repository<TaskTag>,
    private readonly projectService: ProjectService,
    private readonly publisher: ActivityPublisherService,
  ) {}

  async create(projectId: string, userId: string, dto: CreateTaskDto) {
    await this.projectService.requireProjectMember(projectId, userId);
    const task = await this.taskRepo.save(
      this.taskRepo.create({
        projectId,
        creatorId: userId,
        title: dto.title,
        description: this.sanitizeDescription(dto.description),
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'normal',
        assigneeId: dto.assigneeId ?? null,
        dueDate: dto.dueDate ?? null,
        parentId: dto.parentId ?? null,
      }),
    );
    this.publishActivity({
      projectId,
      userId,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      extra: { title: task.title },
    });
    return this.toDetail(task);
  }

  async list(projectId: string, userId: string, query: ListTasksQueryDto) {
    await this.projectService.requireProjectMember(projectId, userId);

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL');

    if (query.status) qb.andWhere('task.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.assigneeId) qb.andWhere('task.assignee_id = :assigneeId', { assigneeId: query.assigneeId });

    if (query.parentId !== undefined) {
      qb.andWhere('task.parent_id = :parentId', { parentId: query.parentId });
    } else {
      qb.andWhere('task.parent_id IS NULL');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [tasks, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      tasks.map(async (t) => {
        const subTaskCount = await this.taskRepo.count({ where: { parentId: t.id, deletedAt: IsNull() } });
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, avatarUrl: t.assignee.avatarUrl } : null,
          dueDate: t.dueDate,
          subTaskCount,
          createdAt: t.createdAt,
        };
      }),
    );

    return { data, meta: { page, limit, total } };
  }

  async findOne(taskId: string, userId: string) {
    const task = await this.loadTask(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    const subTaskCount = await this.taskRepo.count({ where: { parentId: taskId, deletedAt: IsNull() } });

    return {
      id: task.id,
      projectId: task.projectId,
      parentId: task.parentId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, avatarUrl: task.assignee.avatarUrl } : null,
      creator: task.creator ? { id: task.creator.id, name: task.creator.name, avatarUrl: task.creator.avatarUrl } : null,
      dueDate: task.dueDate,
      tags: (task.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
      subTaskCount,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.loadTask(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);
    const before = {
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      title: task.title,
    };
    const updatePayload = {
      ...dto,
      ...(dto.description !== undefined
        ? { description: this.sanitizeDescription(dto.description) }
        : {}),
    };
    await this.taskRepo.update(taskId, updatePayload);
    const updated = await this.taskRepo.findOneOrFail({ where: { id: taskId } });
    const after = {
      status: updated.status,
      priority: updated.priority,
      assigneeId: updated.assigneeId,
      title: updated.title,
    };

    this.publishActivity({
      projectId: task.projectId,
      userId,
      action: 'task.updated',
      entityType: 'task',
      entityId: taskId,
      extra: { before, after },
    });

    if (dto.status !== undefined && dto.status !== task.status) {
      this.publishActivity({
        projectId: task.projectId,
        userId,
        action: 'task.status_changed',
        entityType: 'task',
        entityId: taskId,
        extra: { before: { status: task.status }, after: { status: dto.status } },
      });
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      this.publishActivity({
        projectId: task.projectId,
        userId,
        action: 'task.assigned',
        entityType: 'task',
        entityId: taskId,
        extra: { assigneeId: dto.assigneeId },
      });
    }

    return { id: updated.id, title: updated.title, status: updated.status, updatedAt: updated.updatedAt };
  }

  async remove(taskId: string, userId: string) {
    const task = await this.loadTask(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);
    // soft-delete subtasks first
    const subtasks = await this.taskRepo.find({ where: { parentId: taskId } });
    if (subtasks.length) await this.taskRepo.softDelete(subtasks.map((s) => s.id));
    await this.taskRepo.softDelete(taskId);
    this.publishActivity({
      projectId: task.projectId,
      userId,
      action: 'task.deleted',
      entityType: 'task',
      entityId: taskId,
      extra: { title: task.title },
    });
  }

  async listSubtasks(taskId: string, userId: string) {
    const task = await this.loadTask(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);
    const subtasks = await this.taskRepo.find({
      where: { parentId: taskId, deletedAt: IsNull() },
      relations: ['assignee'],
    });
    return subtasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, avatarUrl: t.assignee.avatarUrl } : null,
      dueDate: t.dueDate,
    }));
  }

  // ── tags ─────────────────────────────────────────────────────────────────

  async listTags(projectId: string, userId: string) {
    await this.projectService.requireProjectMember(projectId, userId);
    return this.tagRepo.find({ where: { projectId } });
  }

  async createTag(projectId: string, userId: string, dto: CreateTagDto) {
    await this.projectService.requireProjectMember(projectId, userId);
    const existing = await this.tagRepo.findOne({ where: { projectId, name: dto.name } });
    if (existing) throw new BadRequestException('Tag name already exists in this project');
    return this.tagRepo.save(this.tagRepo.create({ projectId, name: dto.name, color: dto.color ?? null }));
  }

  async setTaskTags(taskId: string, userId: string, dto: SetTaskTagsDto) {
    const task = await this.loadTask(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    const tags = dto.tagIds.length
      ? await this.tagRepo.findByIds(dto.tagIds)
      : [];

    task.tags = tags;
    await this.taskRepo.save(task);
    return { tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })) };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  // exposed for CommentService
  async loadTaskForComment(taskId: string): Promise<Task> {
    return this.loadTask(taskId);
  }

  private async loadTask(taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, deletedAt: IsNull() },
      relations: ['assignee', 'creator', 'tags'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async getWorkspaceId(projectId: string): Promise<string> {
    return this.projectService.getProjectWorkspaceId(projectId);
  }

  private sanitizeDescription(html: string | null | undefined): string | null {
    if (!html?.trim()) {
      return null;
    }

    return sanitizeHtml(html, {
      allowedTags: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        's',
        'h1',
        'h2',
        'h3',
        'ol',
        'ul',
        'li',
        'a',
        'blockquote',
        'pre',
        'code',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
          rel: 'noopener noreferrer',
          target: '_blank',
        }),
      },
    });
  }

  private publishActivity(params: {
    projectId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    extra?: Record<string, unknown>;
  }) {
    void this.getWorkspaceId(params.projectId)
      .then((workspaceId) =>
        this.publisher.publish({
          workspaceId,
          projectId: params.projectId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          extra: params.extra,
        }),
      )
      .catch(() => {});
  }

  private toDetail(task: Task) {
    return {
      id: task.id,
      projectId: task.projectId,
      parentId: task.parentId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    };
  }
}
