import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';
import { FieldNote, FieldNoteDocument } from '../database/schemas/field-note.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { SubmitKycDto } from './dto/kyc.dto';
import { ListVendorsDto } from './dto/list-vendors.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(FieldNote.name) private fieldNoteModel: Model<FieldNoteDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    await user.save();
    return user;
  }

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<UserDocument> {
    const user = await this.findById(userId);
    user.kyc = {
      status: 'pending',
      docType: dto.docType,
      docKey: dto.docKey,
      submittedAt: new Date(),
    } as any;
    await user.save();
    return user;
  }

  async getFieldNotes(userId: string): Promise<FieldNoteDocument[]> {
    return this.fieldNoteModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findVendorById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ _id: id, roles: 'vendor' });
    if (!user) throw new NotFoundException('Vendor not found.');
    return user;
  }

  async listVendors(dto: ListVendorsDto): Promise<UserDocument[]> {
    const filter: FilterQuery<UserDocument> = { roles: 'vendor' };
    if (dto.location) {
      filter.location = new RegExp(escapeRegex(dto.location), 'i');
    }
    return this.userModel.find(filter).sort({ 'vendorProfile.rating': -1 });
  }

  /** Denormalized counter helpers, used by FollowsModule/TreksModule/BookingsModule. */
  async incrementCounters(userId: string, delta: Partial<Record<'followersCount' | 'followingCount' | 'treksCount', number>>) {
    await this.userModel.updateOne({ _id: userId }, { $inc: delta });
  }

  /**
   * Used by ReviewsService when a targetType:'user' review lands on an
   * account that holds the vendor role — vendorProfile.rating is the only
   * aggregate field the schema has for a user. A review of a plain trekker
   * (peer-to-peer, project doc 4.7) has nowhere to persist an aggregate;
   * GET /reviews still returns the individual reviews either way.
   */
  async updateVendorRatingAggregate(userId: string, rating: number, ratingCount: number): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId, roles: 'vendor' },
      { 'vendorProfile.rating': rating, 'vendorProfile.ratingCount': ratingCount },
    );
  }
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
