import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JoinRequestDocument = JoinRequest & Document;
export type JoinRequestStatus = 'pending' | 'accepted' | 'declined';

/**
 * Closes frontend gap #1 — "Request to Join" on PeerTrekPartnerScreen was
 * previously a no-op. Accepting a request auto-creates (or reuses) a
 * conversation between organizer and requester (project doc 4.11: "chat
 * unlocked after acceptance").
 */
@Schema({ timestamps: true })
export class JoinRequest {
  @Prop({ type: Types.ObjectId, ref: 'Trek', required: true })
  trekId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ enum: ['pending', 'accepted', 'declined'], default: 'pending' })
  status: JoinRequestStatus;

  @Prop({ type: Date, default: null })
  respondedAt: Date | null;

  // See User.isDemo — same purpose, set by scripts/seed-demo-sahyadri.ts.
  @Prop({ default: false, index: true })
  isDemo: boolean;
}

export const JoinRequestSchema = SchemaFactory.createForClass(JoinRequest);
// One request per person per trek.
JoinRequestSchema.index({ trekId: 1, requesterId: 1 }, { unique: true });
JoinRequestSchema.index({ requesterId: 1 });
