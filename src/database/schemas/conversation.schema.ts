import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  // Exactly 2 — no group chat in v1 per project doc.
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participantIds: Types.ObjectId[];

  // [id1, id2].sort().join('_') — prevents duplicate 1:1 threads between the same pair.
  @Prop({ required: true, unique: true })
  participantsKey: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participantIds: 1 });
