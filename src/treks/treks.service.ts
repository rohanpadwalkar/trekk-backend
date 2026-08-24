import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { createHash } from 'crypto';
import { Trek, TrekDocument } from '../database/schemas/trek.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { CreateTrekDto } from './dto/create-trek.dto';
import { UpdateTrekDto } from './dto/update-trek.dto';
import { ListTreksDto } from './dto/list-treks.dto';

const CACHE_PREFIX = 'treks:list:';
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class TreksService {
  constructor(
    @InjectModel(Trek.name) private trekModel: Model<TrekDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redis: RedisService,
  ) {}

  async findAll(filters: ListTreksDto): Promise<TrekDocument[]> {
    const cacheKey = CACHE_PREFIX + hashFilters(filters);
    const cached = await this.redis.get<TrekDocument[]>(cacheKey);
    if (cached) return cached;

    const query: FilterQuery<TrekDocument> = {};
    if (filters.organizerType) query.organizerType = filters.organizerType;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.ecoRating) query.ecoRating = filters.ecoRating;
    if (filters.maxBudget !== undefined) {
      query.$or = [{ price: { $lte: filters.maxBudget } }, { price: null }];
    }
    if (filters.availableSeatsOnly) {
      query.seatsLeft = { $gt: 0 };
    }
    if (filters.destination) {
      query.$text = { $search: filters.destination };
    }

    const results = await this.trekModel.find(query).sort({ dateStart: 1 }).limit(200).lean();
    await this.redis.set(cacheKey, results, CACHE_TTL_SECONDS);
    return results as unknown as TrekDocument[];
  }

  async findById(id: string): Promise<TrekDocument> {
    const trek = await this.trekModel.findById(id);
    if (!trek) throw new NotFoundException('Trek not found.');
    return trek;
  }

  async create(userId: string, dto: CreateTrekDto): Promise<TrekDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new ForbiddenException('Account not found.');

    if (dto.organizerType === 'vendor' && !user.roles.includes('vendor')) {
      throw new ForbiddenException('Only vendor accounts can create vendor trek listings.');
    }
    if (dto.organizerType === 'peer' && !user.verified) {
      // Hard KYC gate — see docs/10-backend-design.md Section 3. This is
      // deliberately stricter than vendor listing creation, per project doc
      // 4.7's callout that peer trek-partner matching is the higher-risk feature.
      throw new ForbiddenException('Identity verification (KYC) is required before creating a peer trek. Submit KYC via POST /users/me/kyc first.');
    }

    const trek = await this.trekModel.create({
      ...dto,
      organizerId: new Types.ObjectId(userId),
      seatsLeft: dto.totalSeats,
      price: dto.price ?? null,
    });

    await this.userModel.updateOne({ _id: userId }, { $inc: { treksCount: 1 } });
    await this.invalidateListCache();
    return trek;
  }

  async update(userId: string, trekId: string, dto: UpdateTrekDto): Promise<TrekDocument> {
    const trek = await this.findById(trekId);
    this.assertOwnership(trek, userId);

    Object.assign(trek, dto);
    await trek.save();
    await this.invalidateListCache();
    return trek;
  }

  async remove(userId: string, trekId: string): Promise<void> {
    const trek = await this.findById(trekId);
    this.assertOwnership(trek, userId);
    await trek.deleteOne();
    await this.invalidateListCache();
  }

  /** Used by BookingsService inside a transaction — does not itself invalidate cache (caller does, post-commit). */
  async decrementSeats(trekId: Types.ObjectId, session: unknown): Promise<TrekDocument> {
    const trek = await this.trekModel.findOneAndUpdate(
      { _id: trekId, seatsLeft: { $gt: 0 } },
      [
        {
          $set: {
            seatsLeft: { $subtract: ['$seatsLeft', 1] },
          },
        },
        {
          $set: {
            status: { $cond: [{ $lte: [{ $subtract: ['$seatsLeft', 1] }, 0] }, 'closed', '$status'] },
          },
        },
      ] as any,
      { new: true, session: session as any },
    );
    if (!trek) {
      throw new ForbiddenException('No seats left on this trek.');
    }
    return trek;
  }

  async incrementSeats(trekId: Types.ObjectId, session: unknown): Promise<void> {
    await this.trekModel.updateOne(
      { _id: trekId },
      [
        { $set: { seatsLeft: { $add: ['$seatsLeft', 1] } } },
        { $set: { status: { $cond: [{ $gt: [{ $add: ['$seatsLeft', 1] }, 0] }, 'upcoming', '$status'] } } },
      ] as any,
      { session: session as any },
    );
  }

  async applyReviewAggregate(trekId: Types.ObjectId, rating: number, reviewCount: number): Promise<void> {
    await this.trekModel.updateOne({ _id: trekId }, { rating, reviewCount });
  }

  async invalidateListCache(): Promise<void> {
    await this.redis.delByPrefix(CACHE_PREFIX);
  }

  private assertOwnership(trek: TrekDocument, userId: string): void {
    if (trek.organizerId.toString() !== userId) {
      throw new ForbiddenException('You do not own this trek.');
    }
  }
}

function hashFilters(filters: ListTreksDto): string {
  return createHash('sha1').update(JSON.stringify(filters)).digest('hex');
}
