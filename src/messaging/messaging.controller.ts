import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('messaging')
@ApiBearerAuth('access-token')
@Controller('conversations')
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private messagingGateway: MessagingGateway,
  ) {}

  @Get()
  async list(@CurrentUser('userId') userId: string) {
    return this.messagingService.listConversations(userId);
  }

  @Get(':id')
  async getOne(@CurrentUser('userId') userId: string, @Param('id') id: string, @Query('page') page?: string) {
    return this.messagingService.getConversation(userId, id, page ? parseInt(page, 10) : 1);
  }

  @Post(':id/messages')
  async sendMessage(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: SendMessageDto) {
    const message = await this.messagingService.sendMessage(userId, id, dto);
    this.messagingGateway.emitNewMessage(id, message);
    return message;
  }
}
