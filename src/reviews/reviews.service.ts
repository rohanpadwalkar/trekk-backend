import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from '../database/schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { TreksService } from '../treks/treks.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private treksService: TreksService,
    private usersService: UsersService,
  ) {}

  async list(dto: ListReviewsDto): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ targetType: dto.targetType, targetId: dto.targetId }).sort({ createdAt: -1 });
  }

  async create(authorId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    const review = await this.reviewModel.create({
      targetType: dto.targetType,
      targetId: new Types.ObjectId(dto.targetId),
      authorId: new Types.ObjectId(authorId),
      rating: dto.rating,
      text: dto.text ?? '',
    });

    const { avgRating, count } = await this.recomputeAggregate(dto.targetType, dto.targetId);

    if (dto.targetType === 'trek') {
      await this.treksService.applyReviewAggregate(new Types.ObjectId(dto.targetId), avgRating, count);
    } else {
      await this.usersService.updateVendorRatingAggregate(dto.targetId, avgRating, count);
    }

    return review;
  }

  private async recomputeAggregate(
    targetType: 'trek' | 'user',
    targetId: string,
  ): Promise<{ avgRating: number; count: number }> {
    const [result] = await this.reviewModel.aggregate([
      { $match: { targetType, targetId: new Types.ObjectId(targetId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return {
      avgRating: result ? Math.round(result.avgRating * 10) / 10 : 0,
      count: result?.count ?? 0,
    };
  }
}
