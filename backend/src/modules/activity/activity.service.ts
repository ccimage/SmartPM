import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nsq from 'nsqjs';
import { ActivityLog } from './activity-log.entity';
import { ListActivitiesQueryDto } from './dto/activity.dto';
import { ProjectService } from '../project/project.service';
import { TaskService } from '../task/task.service';

export interface PaginatedResult<T = ActivityListItem> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ActivityListItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  extra: Record<string, unknown> | null;
  createdAt: Date;
}

@Injectable()
export class ActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityService.name);
  private reader: nsq.Reader | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('NSQ_NSQD_HOST') ?? 'localhost';
    const port = this.config.get<string>('NSQ_NSQD_PORT') ?? '4150';
    const nsqdAddress = `${host}:${port}`;

    this.reader = new nsq.Reader('activity.log', 'activity-writer', {
      nsqdTCPAddresses: [nsqdAddress],
    });

    this.reader.on('message', (msg: nsq.Message) => {
      this.handleMessage(msg).catch((error: unknown) => {
        this.logger.error(
          'Unhandled error while processing activity log message',
          error instanceof Error ? error.stack : undefined,
        );
        msg.finish();
      });
    });

    this.reader.connect();
    this.logger.log(`Activity NSQ consumer connected directly to nsqd: ${nsqdAddress}`);
  }

  onModuleDestroy() {
    this.reader?.close();
  }

  async listByProject(projectId: string, userId: string, query: ListActivitiesQueryDto) {
    await this.projectService.requireProjectMember(projectId, userId);
    return this.listActivities({ projectId, query });
  }

  async listByTask(taskId: string, userId: string, query: ListActivitiesQueryDto) {
    const task = await this.taskService.loadTaskForComment(taskId);
    await this.projectService.requireProjectMember(task.projectId, userId);

    return this.listActivities({
      projectId: task.projectId,
      query,
      fixedEntityType: 'task',
      fixedEntityId: taskId,
    });
  }

  private async handleMessage(msg: nsq.Message) {
    try {
      const raw = JSON.parse(msg.body.toString()) as Partial<ActivityLog>;
      if (!raw.workspaceId || !raw.userId || !raw.action || !raw.entityType || !raw.entityId) {
        throw new Error('Invalid activity payload');
      }

      await this.activityLogRepo.save(
        this.activityLogRepo.create({
          workspaceId: raw.workspaceId,
          projectId: raw.projectId ?? null,
          userId: raw.userId,
          action: raw.action,
          entityType: raw.entityType,
          entityId: raw.entityId,
          extra: raw.extra ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to persist activity log message',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      msg.finish();
    }
  }

  private async listActivities(params: {
    projectId: string;
    query: ListActivitiesQueryDto;
    fixedEntityType?: string;
    fixedEntityId?: string;
  }): Promise<PaginatedResult> {
    const page = params.query.page ?? 1;
    const limit = params.query.limit ?? 20;

    const qb = this.activityLogRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.project_id = :projectId', { projectId: params.projectId });

    if (params.fixedEntityType) {
      qb.andWhere('activity.entity_type = :entityType', { entityType: params.fixedEntityType });
    }

    if (params.fixedEntityId) {
      qb.andWhere('activity.entity_id = :entityId', { entityId: params.fixedEntityId });
    }

    if (!params.fixedEntityType && params.query.entityType) {
      qb.andWhere('activity.entity_type = :queryEntityType', { queryEntityType: params.query.entityType });
    }

    if (!params.fixedEntityId && params.query.entityId) {
      qb.andWhere('activity.entity_id = :queryEntityId', { queryEntityId: params.query.entityId });
    }

    qb.orderBy('activity.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [activities, total] = await qb.getManyAndCount();

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        user: {
          id: activity.user.id,
          name: activity.user.name,
          avatarUrl: activity.user.avatarUrl,
        },
        extra: activity.extra,
        createdAt: activity.createdAt,
      })),
      meta: { page, limit, total },
    };
  }
}
