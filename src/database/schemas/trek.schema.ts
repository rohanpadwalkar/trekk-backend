import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrekDocument = Trek & Document;

export type OrganizerType = 'vendor' | 'peer';
export type Difficulty = 'Easy' | 'Moderate' | 'Hard' | 'Expert';
export type EcoRating = 'Low Impact' | 'Regenerative';
export type TrekStatus = 'upcoming' | 'ongoing' | 'past' | 'closed';

@Schema({ _id: false })
class ItineraryDay {
  @Prop({ required: true })
  day: number;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  detail: string;
}

@Schema({ timestamps: true })
export class Trek {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ default: '' })
  summary: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  organizerId: Types.ObjectId;

  @Prop({ required: true, enum: ['vendor', 'peer'], index: true })
  organizerType: OrganizerType;

  @Prop({ type: String, default: null })
  coverImage: string | null;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true, enum: ['Easy', 'Moderate', 'Hard', 'Expert'], index: true })
  difficulty: Difficulty;

  @Prop({ required: true, min: 1 })
  durationDays: number;

  // null for free peer treks
  @Prop({ type: Number, default: null, index: true })
  price: number | null;

  @Prop({ required: true, min: 0 })
  totalSeats: number;

  @Prop({ required: true, min: 0 })
  seatsLeft: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ required: true })
  dateStart: Date;

  @Prop({ required: true })
  dateEnd: Date;

  @Prop({ type: [ItineraryDay], default: [] })
  itinerary: ItineraryDay[];

  @Prop({ type: String, enum: ['Low Impact', 'Regenerative'], default: null })
  ecoRating: EcoRating | null;

  // Project doc 4.1 calls for listing status; frontend doesn't track it yet.
  // Auto-derived to 'closed' when seatsLeft hits 0 (see TreksService).
  @Prop({ enum: ['upcoming', 'ongoing', 'past', 'closed'], default: 'upcoming', index: true })
  status: TrekStatus;
}

export const TrekSchema = SchemaFactory.createForClass(Trek);

// Shape of the Discover feed's default query (list, filtered, sorted by start date).
TrekSchema.index({ organizerType: 1, status: 1, dateStart: 1 });
// Destination / title search box.
TrekSchema.index({ title: 'text', location: 'text' });
