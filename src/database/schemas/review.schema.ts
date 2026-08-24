import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;
export type ReviewTargetType = 'trek' | 'user';

/**
 * Polymorphic target so one collection covers both "review a vendor's trek"
 * and "review a fellow peer-trekker" (project doc 4.7).
 */
@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, enum: ['trek', 'user'] })
  targetType: ReviewTargetType;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
  text: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ targetType: 1, targetId: 1 });
ReviewSchema.index({ authorId: 1 });
