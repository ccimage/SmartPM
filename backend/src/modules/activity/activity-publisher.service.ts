import { Injectable } from '@nestjs/common';
import { NsqService } from '../../infra/nsq/nsq.module';

@Injectable()
export class ActivityPublisherService {
  constructor(private readonly nsqService: NsqService) {}

  async publish(payload: {
    workspaceId: string;
    projectId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    extra?: Record<string, unknown>;
  }): Promise<void> {
    await this.nsqService.publish('activity.log', payload);
  }
}
