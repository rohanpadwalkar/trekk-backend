import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Trek ObjectId to book a seat on' })
  @IsMongoId()
  trekId: string;
}
