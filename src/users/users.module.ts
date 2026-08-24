import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { VendorsController } from './vendors.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController, VendorsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
