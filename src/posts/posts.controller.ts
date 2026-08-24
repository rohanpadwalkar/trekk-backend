import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post as HttpPost } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('posts')
@ApiBearerAuth('access-token')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get('feed')
  async feed(@CurrentUser('userId') userId: string) {
    return this.postsService.feed(userId);
  }

  @HttpPost()
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @HttpPost(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    await this.postsService.like(userId, id);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    await this.postsService.unlike(userId, id);
  }
}
