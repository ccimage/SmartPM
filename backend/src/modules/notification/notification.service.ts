import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { ListNotificationsQueryDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async list(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { userId };
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [notifications, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.repo.count({ where: { userId, isRead: false } });

    const data = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      content: n.content,
      isRead: n.isRead,
      extra: n.extra,
      createdAt: n.createdAt,
    }));

    return { data, meta: { page, limit, total, unreadCount } };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.repo.findOne({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException();

    await this.repo.update(notificationId, { isRead: true });
    return { id: notificationId, isRead: true };
  }

  async markAllRead(userId: string) {
    const result = await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { updated: result.affected ?? 0 };
  }

  async unreadCount(userId: string) {
    const count = await this.repo.count({ where: { userId, isRead: false } });
    return { count };
  }

  // used by NSQ consumer / other services to create notifications
  async create(data: {
    userId: string;
    type: string;
    content: string;
    extra?: Record<string, unknown>;
  }): Promise<Notification> {
    return this.repo.save(
      this.repo.create({
        userId: data.userId,
        type: data.type,
        content: data.content,
        extra: data.extra ?? null,
      }),
    );
  }
}
