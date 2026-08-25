import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export type AppRole = 'trekker' | 'vendor' | 'admin';
export type KycStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

@Schema({ _id: false })
class AuthProvider {
  @Prop({ required: true, enum: ['google', 'apple'] })
  provider: 'google' | 'apple';

  @Prop({ required: true })
  providerId: string;
}

@Schema({ _id: false })
class Kyc {
  @Prop({ required: true, enum: ['unsubmitted', 'pending', 'approved', 'rejected'], default: 'unsubmitted' })
  status: KycStatus;

  @Prop() docType?: string;
  @Prop() docKey?: string; // MinIO key in the private kyc-documents bucket
  @Prop() submittedAt?: Date;
  @Prop() reviewedAt?: Date;
  @Prop() reviewerNote?: string;
}

@Schema({ _id: false })
class VendorProfile {
  @Prop({ required: true })
  businessName: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  ratingCount: number;
}

@Schema({ _id: false })
class EmergencyContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  // null when the account was created via OAuth only. Never serialized —
  // see the toJSON transform below.
  @Prop({ type: String, default: null })
  passwordHash: string | null;

  @Prop({ type: [AuthProvider], default: [] })
  authProviders: AuthProvider[];

  @Prop({ type: [String], enum: ['trekker', 'vendor', 'admin'], default: ['trekker'], index: true })
  roles: AppRole[];

  @Prop({ type: String, default: null })
  avatar: string | null;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Kyc, default: () => ({ status: 'unsubmitted' }) })
  kyc: Kyc;

  @Prop({ type: VendorProfile, default: null })
  vendorProfile: VendorProfile | null;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: 0 })
  treksCount: number;

  // Rotation family id for refresh tokens — see refresh-token.schema.ts.
  @Prop({ type: String, default: null })
  refreshTokenFamily: string | null;

  // Schema hook for future safety/SOS features (project doc 4.10) — not
  // exposed by any endpoint yet, intentionally out of scope this phase.
  @Prop({ type: EmergencyContact, default: null })
  emergencyContact: EmergencyContact | null;

  // Set by scripts/seed-demo-sahyadri.ts. Lets demo/launch-content data be
  // identified and wiped in bulk (db.<collection>.deleteMany({ isDemo: true }))
  // without touching real accounts — never set true by any app code path.
  @Prop({ default: false, index: true })
  isDemo: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ 'kyc.status': 1 });

// passwordHash must never leave the server — this runs on every JSON
// serialization (res.json(), including inside arrays), so no controller
// has to remember to strip it manually.
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});
