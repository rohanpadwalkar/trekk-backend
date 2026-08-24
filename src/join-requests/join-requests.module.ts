import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JoinRequestsService } from './join-requests.service';
import { TrekJoinRequestsController, JoinRequestsController } from './join-requests.controller';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [TrekJoinRequestsController, JoinRequestsController],
  providers: [JoinRequestsService],
})
export class JoinRequestsModule {}
