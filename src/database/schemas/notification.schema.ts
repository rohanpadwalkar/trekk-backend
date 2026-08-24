import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;
export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'trail-update'
  | 'digest'
  | 'booking'
  | 'join-request'
  | 'message';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // recipient

  @Prop({
    required: true,
    enum: ['like', 'comment', 'follow', 'trail-update', 'digest', 'booking', 'join-request', 'message'],
  })
  type: NotificationType;

  @Prop({ required: true })
  text: string;

  @Prop({ type: Types.ObjectId, default: null })
  relatedId: Types.ObjectId | null;

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Exact shape of the inbox query: unread-first, newest-first, for one recipient.
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
