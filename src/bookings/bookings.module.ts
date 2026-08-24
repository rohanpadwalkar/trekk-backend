import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TreksModule } from '../treks/treks.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [DatabaseModule, TreksModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
