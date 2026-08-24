import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowEdgeDocument = FollowEdge & Document;

@Schema({ timestamps: true })
export class FollowEdge {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followingId: Types.ObjectId;
}

export const FollowEdgeSchema = SchemaFactory.createForClass(FollowEdge);
// Emulates a relational unique join-table constraint: can't follow the same person twice.
FollowEdgeSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// Followers-of lookup.
FollowEdgeSchema.index({ followingId: 1 });
