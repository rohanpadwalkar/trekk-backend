import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../database/schemas/post.schema';
import { Like, LikeDocument } from '../database/schemas/like.schema';
import { FollowEdge, FollowEdgeDocument } from '../database/schemas/follow-edge.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { NotificationsService } from '../notifications/notifications.service';

const FEED_LIMIT = 50;

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(FollowEdge.name) private followModel: Model<FollowEdgeDocument>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Feed = posts from people you follow, plus your own. New users following
   * no one would otherwise see an empty feed, so we fall back to global
   * recent posts in that case — a reasonable default in the absence of a
   * more specific spec for this endpoint.
   */
  async feed(userId: string): Promise<PostDocument[]> {
    const edges = await this.followModel.find({ followerId: userId });
    const authorIds = [...edges.map((e) => e.followingId), new Types.ObjectId(userId)];

    const personalized = await this.postModel
      .find({ authorId: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .limit(FEED_LIMIT);

    if (personalized.length > 0) return personalized;

    return this.postModel.find().sort({ createdAt: -1 }).limit(FEED_LIMIT);
  }

  async create(authorId: string, dto: CreatePostDto): Promise<PostDocument> {
    return this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      type: dto.type,
      images: dto.images,
      caption: dto.caption ?? '',
      trekId: dto.trekId ? new Types.ObjectId(dto.trekId) : null,
    });
  }

  async like(userId: string, postId: string): Promise<void> {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found.');

    try {
      await this.likeModel.create({ userId: new Types.ObjectId(userId), postId: new Types.ObjectId(postId) });
    } catch (err: any) {
      if (err.code === 11000) return; // already liked — idempotent no-op
      throw err;
    }

    await this.postModel.updateOne({ _id: postId }, { $inc: { likeCount: 1 } });

    if (post.authorId.toString() !== userId) {
      await this.notificationsService.fire(post.authorId, 'like', 'Someone liked your post.', post._id as Types.ObjectId);
    }
  }

  async unlike(userId: string, postId: string): Promise<void> {
    const result = await this.likeModel.deleteOne({ userId, postId });
    if (result.deletedCount === 0) return;
    await this.postModel.updateOne({ _id: postId }, { $inc: { likeCount: -1 } });
  }
}
