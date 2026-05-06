import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nsq from 'nsqjs';

@Injectable()
export class NsqService implements OnModuleInit, OnModuleDestroy {
  private writer: nsq.Writer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.writer = new nsq.Writer(
      this.config.get<string>('NSQ_NSQD_HOST'),
      this.config.get<number>('NSQ_NSQD_PORT'),
    );
    this.writer.connect();
  }

  onModuleDestroy() {
    this.writer.close();
  }

  publish(topic: string, message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writer.publish(topic, JSON.stringify(message), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NsqService],
  exports: [NsqService],
})
export class NsqModule {}
