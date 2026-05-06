import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { TaskService } from '../task/task.service';
import { ProjectService } from '../project/project.service';
import { UserService } from '../user/user.service';
import { CreateCommentDto, ListCommentsQueryDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
  ) {}

  async list(taskId: string, userId: string, query: ListCommentsQueryDto) {
    const task = await this.taskService.loadTaskForComment(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [comments, total] = await this.commentRepo.findAndCount({
      where: { taskId, deletedAt: IsNull() },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(
      comments.map(async (c) => {
        const mentions = await this.resolveMentions(c.extra?.mentions ?? []);
        return {
          id: c.id,
          content: c.content,
          author: { id: c.author.id, name: c.author.name, avatarUrl: c.author.avatarUrl },
          mentions,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      }),
    );

    return { data, meta: { page, limit, total } };
  }

  async create(taskId: string, userId: string, dto: CreateCommentDto) {
    const task = await this.taskService.loadTaskForComment(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    const mentionIds = dto.mentionUserIds ?? [];
    const comment = await this.commentRepo.save(
      this.commentRepo.create({
        taskId,
        userId,
        content: dto.content,
        extra: mentionIds.length ? { mentions: mentionIds } : null,
      }),
    );

    const author = await this.userService.findById(userId);
    const mentions = await this.resolveMentions(mentionIds);

    return {
      id: comment.id,
      content: comment.content,
      author: { id: author!.id, name: author!.name, avatarUrl: author!.avatarUrl },
      mentions,
      createdAt: comment.createdAt,
    };
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.loadComment(commentId);
    if (comment.userId !== userId) throw new ForbiddenException('Only the author can edit this comment');

    const mentionIds = dto.mentionUserIds ?? [];
    await this.commentRepo.update(commentId, {
      content: dto.content,
      extra: mentionIds.length ? { mentions: mentionIds } : null,
    });

    return {
      id: commentId,
      content: dto.content,
      updatedAt: new Date(),
    };
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.loadComment(commentId);

    if (comment.userId !== userId) {
      // allow project admin to delete
      const task = await this.taskService.loadTaskForComment(comment.taskId);
      await this.projectService.requireProjectRole(task.projectId, userId, ['admin']);
    }

    await this.commentRepo.softDelete(commentId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async loadComment(commentId: string): Promise<Comment> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, deletedAt: IsNull() } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private async resolveMentions(ids: string[]) {
    if (!ids.length) return [];
    const users = await Promise.all(ids.map((id) => this.userService.findById(id)));
    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({ id: u.id, name: u.name }));
  }
}
