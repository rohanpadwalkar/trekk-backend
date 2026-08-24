import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../database/schemas/conversation.schema';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { SendMessageDto } from './dto/send-message.dto';

const MESSAGES_PAGE_SIZE = 50;

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async listConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({ participantIds: userId })
      .sort({ lastMessageAt: -1 });

    // N+1-ish, but conversation lists are small (v1 has no group chat, so
    // this is bounded by how many 1:1 threads a user has) — an aggregation
    // pipeline would be the next optimization if this becomes a hot path.
    return Promise.all(
      conversations.map(async (conversation) => {
        const otherParticipantId = conversation.participantIds.find((id) => id.toString() !== userId);
        const [otherParticipant, lastMessage] = await Promise.all([
          otherParticipantId ? this.userModel.findById(otherParticipantId) : null,
          this.messageModel.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 }),
        ]);
        return {
          id: conversation._id,
          participant: otherParticipant,
          lastMessage,
          lastMessageAt: conversation.lastMessageAt,
        };
      }),
    );
  }

  async getConversation(userId: string, conversationId: string, page = 1) {
    const conversation = await this.assertParticipant(userId, conversationId);
    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * MESSAGES_PAGE_SIZE)
      .limit(MESSAGES_PAGE_SIZE);

    return { conversation, messages: messages.reverse() };
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto): Promise<MessageDocument> {
    await this.assertParticipant(userId, conversationId);

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      text: dto.text ?? '',
      imageUrl: dto.imageUrl ?? null,
      readBy: [new Types.ObjectId(userId)],
    });

    await this.conversationModel.updateOne({ _id: conversationId }, { lastMessageAt: new Date() });
    return message;
  }

  async assertParticipant(userId: string, conversationId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found.');
    const isParticipant = conversation.participantIds.some((id) => id.toString() === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this conversation.');
    }
    return conversation;
  }
}
