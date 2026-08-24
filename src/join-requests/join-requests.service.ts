import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JoinRequest, JoinRequestDocument } from '../database/schemas/join-request.schema';
import { Trek, TrekDocument } from '../database/schemas/trek.schema';
import { Conversation, ConversationDocument } from '../database/schemas/conversation.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectModel(JoinRequest.name) private joinRequestModel: Model<JoinRequestDocument>,
    @InjectModel(Trek.name) private trekModel: Model<TrekDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async create(requesterId: string, trekId: string): Promise<JoinRequestDocument> {
    const trek = await this.trekModel.findById(trekId);
    if (!trek) throw new NotFoundException('Trek not found.');
    if (trek.organizerType !== 'peer') {
      throw new BadRequestException('Join requests only apply to peer treks.');
    }
    if (trek.organizerId.toString() === requesterId) {
      throw new BadRequestException('You cannot request to join your own trek.');
    }

    let request: JoinRequestDocument;
    try {
      request = await this.joinRequestModel.create({
        trekId: new Types.ObjectId(trekId),
        requesterId: new Types.ObjectId(requesterId),
        status: 'pending',
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('You already requested to join this trek.');
      }
      throw err;
    }

    await this.notificationsService.fire(
      trek.organizerId,
      'join-request',
      'Someone requested to join your trek.',
      request._id as Types.ObjectId,
    );

    return request;
  }

  async listForOrganizer(organizerId: string, trekId: string): Promise<JoinRequestDocument[]> {
    await this.assertOrganizerOwnsTrek(organizerId, trekId);
    return this.joinRequestModel.find({ trekId }).sort({ createdAt: -1 });
  }

  async accept(organizerId: string, joinRequestId: string): Promise<{ joinRequest: JoinRequestDocument; conversationId: string }> {
    const request = await this.findAndAuthorize(organizerId, joinRequestId);
    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    const conversation = await this.findOrCreateConversation(organizerId, request.requesterId.toString());

    await this.notificationsService.fire(
      request.requesterId,
      'join-request',
      'Your request to join a trek was accepted.',
      request._id as Types.ObjectId,
    );

    return { joinRequest: request, conversationId: (conversation._id as Types.ObjectId).toString() };
  }

  async decline(organizerId: string, joinRequestId: string): Promise<JoinRequestDocument> {
    const request = await this.findAndAuthorize(organizerId, joinRequestId);
    request.status = 'declined';
    request.respondedAt = new Date();
    await request.save();

    await this.notificationsService.fire(
      request.requesterId,
      'join-request',
      'Your request to join a trek was declined.',
      request._id as Types.ObjectId,
    );

    return request;
  }

  private async findAndAuthorize(organizerId: string, joinRequestId: string): Promise<JoinRequestDocument> {
    const request = await this.joinRequestModel.findById(joinRequestId);
    if (!request) throw new NotFoundException('Join request not found.');
    await this.assertOrganizerOwnsTrek(organizerId, request.trekId.toString());
    return request;
  }

  private async assertOrganizerOwnsTrek(organizerId: string, trekId: string): Promise<TrekDocument> {
    const trek = await this.trekModel.findById(trekId);
    if (!trek) throw new NotFoundException('Trek not found.');
    if (trek.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('You do not organize this trek.');
    }
    return trek;
  }

  private async findOrCreateConversation(userIdA: string, userIdB: string): Promise<ConversationDocument> {
    const participantsKey = [userIdA, userIdB].sort().join('_');
    const existing = await this.conversationModel.findOne({ participantsKey });
    if (existing) return existing;

    return this.conversationModel.create({
      participantIds: [new Types.ObjectId(userIdA), new Types.ObjectId(userIdB)],
      participantsKey,
      lastMessageAt: new Date(),
    });
  }
}
