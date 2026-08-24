import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from '../database/schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>) {}

  async fire(userId: string | Types.ObjectId, type: NotificationType, text: string, relatedId?: string | Types.ObjectId): Promise<void> {
    await this.notificationModel.create({
      userId,
      type,
      text,
      relatedId: relatedId ?? null,
      read: false,
    });
  }

  async list(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel.find({ userId }).sort({ read: 1, createdAt: -1 }).limit(100);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany({ userId, read: false }, { read: true });
  }
}
