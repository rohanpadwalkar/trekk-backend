import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto.trekId);
  }

  @Get('me')
  async findMine(@CurrentUser('userId') userId: string) {
    return this.bookingsService.findMine(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.bookingsService.findById(userId, id);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.bookingsService.cancel(userId, id);
  }
}
