import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
