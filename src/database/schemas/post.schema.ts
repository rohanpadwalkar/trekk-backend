import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;
export type PostType = 'photo' | 'peer-trek';

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, enum: ['photo', 'peer-trek'] })
  type: PostType;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: '' })
  caption: string;

  @Prop({ type: Types.ObjectId, ref: 'Trek', default: null, index: true })
  trekId: Types.ObjectId | null;

  @Prop({ default: 0 })
  likeCount: number;

  // See User.isDemo — same purpose, set by scripts/seed-demo-sahyadri.ts.
  @Prop({ default: false, index: true })
  isDemo: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
