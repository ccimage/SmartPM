import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import {
  DailySummaryDto,
  GenerateTasksDto,
  ImportTasksDto,
  ListAiLogsQueryDto,
  SplitRequirementDto,
} from './dto/ai.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-tasks')
  @HttpCode(202)
  generateTasks(@CurrentUser() userId: string, @Body() dto: GenerateTasksDto) {
    return this.aiService.generateTasks(userId, dto);
  }

  @Post('split-requirement')
  @HttpCode(202)
  splitRequirement(@CurrentUser() userId: string, @Body() dto: SplitRequirementDto) {
    return this.aiService.splitRequirement(userId, dto);
  }

  @Post('daily-summary')
  @HttpCode(202)
  dailySummary(@CurrentUser() userId: string, @Body() dto: DailySummaryDto) {
    return this.aiService.dailySummary(userId, dto);
  }

  @Get('logs')
  listLogs(@CurrentUser() userId: string, @Query() query: ListAiLogsQueryDto) {
    return this.aiService.listLogs(userId, query);
  }

  @Get('logs/:aiLogId')
  getLog(@CurrentUser() userId: string, @Param('aiLogId') aiLogId: string) {
    return this.aiService.getLog(userId, aiLogId);
  }

  @Post('logs/:aiLogId/import')
  @HttpCode(201)
  importTasks(
    @CurrentUser() userId: string,
    @Param('aiLogId') aiLogId: string,
    @Body() dto: ImportTasksDto,
  ) {
    return this.aiService.importTasks(userId, aiLogId, dto);
  }

  @Post('logs/:aiLogId/retry')
  @HttpCode(202)
  retry(@CurrentUser() userId: string, @Param('aiLogId') aiLogId: string) {
    return this.aiService.retry(userId, aiLogId);
  }
}
