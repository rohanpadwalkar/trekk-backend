import { IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ItineraryDayDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  day: number;

  @ApiProperty({ example: 'Base camp to summit ridge' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  detail: string;
}
