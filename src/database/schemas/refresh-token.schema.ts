import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

/**
 * Not in the mock data — the frontend never had real sessions. New collection
 * to support rotation + reuse detection (see docs/10-backend-design.md Section 3).
 * We only ever store a SHA-256 hash of the raw token, never the token itself,
 * so a stolen database dump can't be replayed directly.
 */
@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  family: string;

  @Prop({ default: false })
  revoked: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
// Mongo auto-deletes expired docs — no cron cleanup job needed.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
