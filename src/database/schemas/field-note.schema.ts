import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FieldNoteDocument = FieldNote & Document;

@Schema({ timestamps: true })
export class FieldNote {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  distance: string;

  @Prop({ default: '' })
  gain: string;

  @Prop({ default: '' })
  time: string;

  @Prop({ default: '' })
  note: string;
}

export const FieldNoteSchema = SchemaFactory.createForClass(FieldNote);
