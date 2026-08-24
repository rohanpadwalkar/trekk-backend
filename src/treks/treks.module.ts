import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TreksService } from './treks.service';
import { TreksController } from './treks.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TreksController],
  providers: [TreksService],
  exports: [TreksService],
})
export class TreksModule {}
