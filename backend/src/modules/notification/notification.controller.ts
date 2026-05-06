import { Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { ListNotificationsQueryDto } from './dto/notification.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query() query: ListNotificationsQueryDto) {
    return this.notificationService.list(userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() userId: string) {
    return this.notificationService.unreadCount(userId);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() userId: string) {
    return this.notificationService.markAllRead(userId);
  }

  @Patch(':notificationId/read')
  markRead(@CurrentUser() userId: string, @Param('notificationId') notificationId: string) {
    return this.notificationService.markRead(userId, notificationId);
  }
}
