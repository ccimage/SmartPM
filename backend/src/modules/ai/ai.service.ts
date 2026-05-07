import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AiLog } from './ai-log.entity';
import { NsqService } from '../../infra/nsq/nsq.module';
import { TaskService } from '../task/task.service';
import {
  DailySummaryDto,
  GenerateTasksDto,
  ImportTasksDto,
  ListAiLogsQueryDto,
  SplitRequirementDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiLog) private readonly repo: Repository<AiLog>,
    private readonly nsq: NsqService,
    private readonly taskService: TaskService,
  ) {}

  async generateTasks(userId: string, dto: GenerateTasksDto) {
    return this.enqueue(userId, 'generate_tasks', dto.projectId, dto.input);
  }

  async splitRequirement(userId: string, dto: SplitRequirementDto) {
    return this.enqueue(userId, 'split_requirement', dto.projectId, dto.input);
  }

  async dailySummary(userId: string, dto: DailySummaryDto) {
    const date = dto.date ?? new Date().toISOString().slice(0, 10);
    return this.enqueue(userId, 'daily_summary', dto.projectId, date);
  }

  async getLog(userId: string, aiLogId: string) {
    const log = await this.repo.findOne({ where: { id: aiLogId } });
    if (!log) throw new NotFoundException('AI log not found');
    if (log.userId !== userId) throw new ForbiddenException();
    return this.formatLog(log);
  }

  async listLogs(userId: string, query: ListAiLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { userId };
    if (query.projectId) where.projectId = query.projectId;

    const [logs, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: logs.map((l) => ({
        aiLogId: l.id,
        type: l.type,
        status: l.status,
        inputPreview: l.inputText ? l.inputText.slice(0, 100) : null,
        createdAt: l.createdAt,
      })),
      meta: { page, limit, total },
    };
  }

  async importTasks(userId: string, aiLogId: string, dto: ImportTasksDto) {
    const log = await this.repo.findOne({ where: { id: aiLogId } });
    if (!log) throw new NotFoundException('AI log not found');
    if (log.userId !== userId) throw new ForbiddenException();
    if (log.status !== 'done') throw new ForbiddenException('AI task not completed yet');
    if (!log.projectId) throw new ForbiddenException('No project associated');

    const taskIds: string[] = [];
    for (const item of dto.tasks) {
      const task = await this.taskService.create(log.projectId, userId, {
        title: item.title,
        description: item.description,
        priority: (item.priority as 'low' | 'normal' | 'high' | 'urgent') ?? 'normal',
        parentId: item.parentId ?? undefined,
      });
      taskIds.push(task.id);
    }

    return { imported: taskIds.length, taskIds };
  }

  async retry(userId: string, aiLogId: string) {
    const log = await this.repo.findOne({ where: { id: aiLogId } });
    if (!log) throw new NotFoundException('AI log not found');
    if (log.userId !== userId) throw new ForbiddenException();
    if (log.status !== 'failed') throw new ForbiddenException('Only failed tasks can be retried');

    await this.repo.update(aiLogId, { status: 'pending', extra: null });

    await this.publishToNsq(log.id, userId, log.projectId, log.type, log.inputText ?? '');

    return { aiLogId, status: 'pending' };
  }

  private async enqueue(
    userId: string,
    type: string,
    projectId: string,
    input: string,
  ) {
    const log = await this.repo.save(
      this.repo.create({ userId, projectId, type, inputText: input, status: 'pending' }),
    );

    await this.publishToNsq(log.id, userId, projectId, type, input);

    return { aiLogId: log.id, status: 'pending' };
  }

  private async publishToNsq(
    aiLogId: string,
    userId: string,
    projectId: string | null,
    type: string,
    input: string,
  ) {
    await this.nsq.publish('ai.task', {
      id: randomUUID(),
      topic: 'ai.task',
      type,
      payload: { aiLogId, userId, projectId, type, input },
      timestamp: Date.now(),
    });
  }

  private formatLog(log: AiLog) {
    const base = {
      aiLogId: log.id,
      type: log.type,
      status: log.status,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };

    if (log.status === 'done') {
      return {
        ...base,
        result: log.type === 'daily_summary' ? log.outputText : (log.extra?.parsed ?? null),
      };
    }

    if (log.status === 'failed') {
      return { ...base, error: (log.extra?.error as string) ?? 'Unknown error' };
    }

    return base;
  }
}
