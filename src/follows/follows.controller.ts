import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('follows')
@ApiBearerAuth('access-token')
@Controller('users')
export class FollowsController {
  constructor(private followsService: FollowsService) {}

  @Public()
  @Get(':id/followers')
  async followers(@Param('id') id: string) {
    return this.followsService.followers(id);
  }

  @Public()
  @Get(':id/following')
  async following(@Param('id') id: string) {
    return this.followsService.following(id);
  }

  @Get(':id/is-following')
  async isFollowing(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return { isFollowing: await this.followsService.isFollowing(userId, id) };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    await this.followsService.follow(userId, id);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    await this.followsService.unfollow(userId, id);
  }
}
