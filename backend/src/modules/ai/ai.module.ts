import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from './ai-log.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiConsumerService } from './ai-consumer.service';
import { LlmService } from './llm.service';
import { TaskModule } from '../task/task.module';
import { NotificationModule } from '../notification/notification.module';
import { WebsocketModule } from '../../infra/websocket/websocket.module';
import { Task } from '../task/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiLog, Task]),
    TaskModule,
    NotificationModule,
    WebsocketModule,
  ],
  providers: [AiService, AiConsumerService, LlmService],
  controllers: [AiController],
})
export class AiModule {}
