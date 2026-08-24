import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JoinRequestsService } from './join-requests.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('join-requests')
@ApiBearerAuth('access-token')
@Controller('treks/:trekId/join-requests')
export class TrekJoinRequestsController {
  constructor(private joinRequestsService: JoinRequestsService) {}

  @Post()
  async create(@CurrentUser('userId') userId: string, @Param('trekId') trekId: string) {
    return this.joinRequestsService.create(userId, trekId);
  }

  @Get()
  async list(@CurrentUser('userId') userId: string, @Param('trekId') trekId: string) {
    return this.joinRequestsService.listForOrganizer(userId, trekId);
  }
}

@ApiTags('join-requests')
@ApiBearerAuth('access-token')
@Controller('join-requests')
export class JoinRequestsController {
  constructor(private joinRequestsService: JoinRequestsService) {}

  @Post(':id/accept')
  async accept(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.joinRequestsService.accept(userId, id);
  }

  @Post(':id/decline')
  async decline(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.joinRequestsService.decline(userId, id);
  }
}
