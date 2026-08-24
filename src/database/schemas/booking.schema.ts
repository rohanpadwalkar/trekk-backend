import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'not_required' | 'stub_paid';

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Trek', required: true, index: true })
  trekId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' })
  status: BookingStatus;

  @Prop({ required: true, unique: true })
  confirmationCode: string;

  @Prop({ default: () => new Date() })
  bookedAt: Date;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  // STUB ONLY — no real payment gateway is wired up (see docs/10-backend-design.md
  // Section 0). This field exists purely so the schema doesn't need a migration
  // once a gateway/deposit-vs-full decision is made.
  @Prop({ enum: ['not_required', 'stub_paid'], default: 'not_required' })
  paymentStatus: PaymentStatus;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
