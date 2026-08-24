import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TreksModule } from '../treks/treks.module';
import { UsersModule } from '../users/users.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [DatabaseModule, TreksModule, UsersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
