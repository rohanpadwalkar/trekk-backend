import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Trek, TrekSchema } from './schemas/trek.schema';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { FollowEdge, FollowEdgeSchema } from './schemas/follow-edge.schema';
import { Post, PostSchema } from './schemas/post.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { JoinRequest, JoinRequestSchema } from './schemas/join-request.schema';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { FieldNote, FieldNoteSchema } from './schemas/field-note.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

/**
 * Central place every feature module imports to get typed Mongoose models.
 * Keeping registration here (rather than scattered per-module) makes it
 * obvious at a glance which collections exist.
 */
// Captured in a const and reused for both imports and exports — exporting
// the bare `MongooseModule` class would NOT re-export these specific
// forFeature() model providers to consumers of DatabaseModule.
const models = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Trek.name, schema: TrekSchema },
  { name: Booking.name, schema: BookingSchema },
  { name: Review.name, schema: ReviewSchema },
  { name: FollowEdge.name, schema: FollowEdgeSchema },
  { name: Post.name, schema: PostSchema },
  { name: Like.name, schema: LikeSchema },
  { name: JoinRequest.name, schema: JoinRequestSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: Message.name, schema: MessageSchema },
  { name: Notification.name, schema: NotificationSchema },
  { name: FieldNote.name, schema: FieldNoteSchema },
  { name: RefreshToken.name, schema: RefreshTokenSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class DatabaseModule {}
