import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

/**
 * Kept as its own collection rather than an embedded array on Conversation —
 * an embedded array grows unbounded and would eventually hit MongoDB's 16MB
 * document cap on a long-running conversation.
 */
@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ default: '' })
  text: string;

  @Prop({ type: String, default: null })
  imageUrl: string | null; // MinIO key

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  readBy: Types.ObjectId[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
// Paginating a thread in order.
MessageSchema.index({ conversationId: 1, createdAt: 1 });
