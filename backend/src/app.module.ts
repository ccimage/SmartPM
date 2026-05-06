import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { NsqModule } from './infra/nsq/nsq.module';
import { WebsocketModule } from './infra/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { CommentModule } from './modules/comment/comment.module';
import { FileModule } from './modules/file/file.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    NsqModule,
    WebsocketModule,
    AuthModule,
    UserModule,
    WorkspaceModule,
    ProjectModule,
    TaskModule,
    CommentModule,
    FileModule,
    NotificationModule,
    AiModule,
  ],
})
export class AppModule {}
