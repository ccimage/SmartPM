import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import * as nsq from 'nsqjs';
import { AiLog } from './ai-log.entity';
import { LlmService } from './llm.service';
import { NsqService } from '../../infra/nsq/nsq.module';
import { EventsGateway } from '../../infra/websocket/events.gateway';
import { Task } from '../task/task.entity';
import { NotificationService } from '../notification/notification.service';

interface AITaskPayload {
  aiLogId: string;
  userId: string;
  projectId: string | null;
  type: string;
  input: string;
}

const PROMPTS = {
  generate_tasks: (input: string) => `你是一个项目管理助手。根据用户的需求描述，生成一组可执行的开发任务。

要求：
- 每个任务标题简洁，不超过 30 字
- 每个任务包含简短描述（1-2 句话）
- 优先级从 low / normal / high / urgent 中选择
- 预估工作天数（estimatedDays），整数
- 任务数量控制在 3~10 个
- 只输出 JSON，不要解释

输出格式：
{"tasks":[{"title":"任务标题","description":"任务描述","priority":"normal","estimatedDays":1}]}

用户需求：
${input}`,

  split_requirement: (input: string) => `你是一个项目管理助手。根据用户提供的需求文档，将其拆分为多级任务树。

要求：
- 顶级任务代表功能模块
- 子任务代表具体开发项
- 最多两级（顶级 + 子任务），不要三级
- 每个任务包含标题、描述、优先级
- 只输出 JSON，不要解释

输出格式：
{"tasks":[{"title":"顶级任务标题","description":"模块描述","priority":"high","children":[{"title":"子任务标题","description":"子任务描述","priority":"normal"}]}]}

需求文档：
${input}`,

  daily_summary: (data: { date: string; doneTasks: string; inProgressTasks: string; pendingTasks: string }) =>
    `你是一个项目管理助手。根据以下任务数据，生成一份简洁的当日工作总结。

要求：
- 总结分三段：今日完成、进行中、待处理
- 语言简洁，每段不超过 3 句话
- 如果某类任务为空，跳过该段
- 直接输出自然语言，不要 JSON，不要标题

任务数据（${data.date}）：
已完成：${data.doneTasks}
进行中：${data.inProgressTasks}
待处理（截止日期最近的 5 条）：${data.pendingTasks}`,
};

@Injectable()
export class AiConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiConsumerService.name);
  private reader: nsq.Reader;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AiLog) private readonly aiLogRepo: Repository<AiLog>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly llm: LlmService,
    private readonly nsqService: NsqService,
    private readonly gateway: EventsGateway,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('NSQ_NSQD_HOST') ?? 'localhost';
    const port = this.config.get<number>('NSQ_NSQD_PORT') ?? 4150;

    this.reader = new nsq.Reader('ai.task', 'ai.task.default', {
      nsqdTCPAddresses: [`${host}:${port}`],
      maxInFlight: 1,
    });

    this.reader.on('message', (msg: nsq.Message) => {
      this.handleMessage(msg).catch((err: unknown) => {
        this.logger.error('Unhandled error in AI consumer', err);
        msg.finish();
      });
    });

    this.reader.connect();
    this.logger.log('AI NSQ consumer connected');
  }

  onModuleDestroy() {
    this.reader?.close();
  }

  private async handleMessage(msg: nsq.Message) {
    let payload: AITaskPayload;
    try {
      const envelope = JSON.parse(msg.body.toString()) as { payload: AITaskPayload };
      payload = envelope.payload;
    } catch {
      this.logger.warn('Failed to parse NSQ message, discarding');
      msg.finish();
      return;
    }

    const { aiLogId, userId, projectId, type, input } = payload;

    const log = await this.aiLogRepo.findOne({ where: { id: aiLogId } });
    if (!log || log.status !== 'pending') {
      msg.finish();
      return;
    }

    await this.aiLogRepo.update(aiLogId, { status: 'processing' });

    try {
      let rawOutput: string;
      let parsed: unknown = null;

      if (type === 'generate_tasks') {
        rawOutput = await this.llm.call(PROMPTS.generate_tasks(input), 0.3);
        parsed = this.llm.parseJSON(rawOutput);
      } else if (type === 'split_requirement') {
        rawOutput = await this.llm.call(PROMPTS.split_requirement(input), 0.3);
        parsed = this.llm.parseJSON(rawOutput);
      } else {
        // daily_summary
        const date = input; // input stores the date for daily_summary
        const summaryData = await this.buildDailySummaryData(projectId!, date);
        rawOutput = await this.llm.call(PROMPTS.daily_summary(summaryData), 0.7);
      }

      await this.aiLogRepo.update(aiLogId, {
        status: 'done',
        outputText: rawOutput,
        extra: parsed ? { parsed } : null,
      });

      await this.notifyUser(userId, aiLogId, type, projectId, 'done');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI task ${aiLogId} failed: ${message}`);

      await this.aiLogRepo.update(aiLogId, {
        status: 'failed',
        extra: { error: message },
      });

      await this.notifyUser(userId, aiLogId, type, projectId, 'failed');
    }

    msg.finish();
  }

  private async buildDailySummaryData(projectId: string, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const done = await this.taskRepo.find({
      where: { projectId, status: 'done', updatedAt: Between(start, end) },
      select: ['title'],
    });

    const inProgress = await this.taskRepo.find({
      where: { projectId, status: 'in_progress' },
      select: ['title'],
    });

    const pending = await this.taskRepo.find({
      where: { projectId, status: 'todo', dueDate: Not(IsNull()) },
      order: { dueDate: 'ASC' },
      take: 5,
      select: ['title', 'dueDate'],
    });

    return {
      date,
      doneTasks: done.map((t) => t.title).join('、') || '无',
      inProgressTasks: inProgress.map((t) => t.title).join('、') || '无',
      pendingTasks: pending.map((t) => `${t.title}(${t.dueDate})`).join('、') || '无',
    };
  }

  private async notifyUser(
    userId: string,
    aiLogId: string,
    type: string,
    projectId: string | null,
    result: 'done' | 'failed',
  ) {
    const event = result === 'done' ? 'ai.done' : 'ai.failed';
    const content = result === 'done' ? `AI 任务（${type}）已完成` : `AI 任务（${type}）处理失败`;

    await this.notificationService.create({ userId, type: event, content, extra: { aiLogId, type, projectId } });

    this.gateway.emitToUser(userId, event, { aiLogId, type, projectId });
  }
}
