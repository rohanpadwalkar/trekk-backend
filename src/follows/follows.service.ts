import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowEdge, FollowEdgeDocument } from '../database/schemas/follow-edge.schema';
import { User, UserDocument } from '../database/schemas/user.schema';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(FollowEdge.name) private followModel: Model<FollowEdgeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async followers(userId: string): Promise<UserDocument[]> {
    const edges = await this.followModel.find({ followingId: userId });
    return this.userModel.find({ _id: { $in: edges.map((e) => e.followerId) } });
  }

  async following(userId: string): Promise<UserDocument[]> {
    const edges = await this.followModel.find({ followerId: userId });
    return this.userModel.find({ _id: { $in: edges.map((e) => e.followingId) } });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const edge = await this.followModel.findOne({ followerId, followingId });
    return !!edge;
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.');
    }
    try {
      await this.followModel.create({
        followerId: new Types.ObjectId(followerId),
        followingId: new Types.ObjectId(followingId),
      });
    } catch (err: any) {
      // Unique index violation — already following. Treat as a no-op success
      // rather than an error, so a double-tap in the UI doesn't surface a 500.
      if (err.code === 11000) return;
      throw err;
    }
    await Promise.all([
      this.userModel.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }),
      this.userModel.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } }),
    ]);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await this.followModel.deleteOne({ followerId, followingId });
    if (result.deletedCount === 0) return;
    await Promise.all([
      this.userModel.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }),
      this.userModel.updateOne({ _id: followingId }, { $inc: { followersCount: -1 } }),
    ]);
  }
}
