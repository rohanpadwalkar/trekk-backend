import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItineraryDayDto } from './itinerary-day.dto';

export class CreateTrekDto {
  @ApiProperty({ example: 'Kedarkantha Winter Trek' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Uttarakhand, India' })
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['vendor', 'peer'] })
  @IsIn(['vendor', 'peer'])
  organizerType: 'vendor' | 'peer';

  @ApiPropertyOptional({ description: 'Object storage key' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ enum: ['Easy', 'Moderate', 'Hard', 'Expert'] })
  @IsIn(['Easy', 'Moderate', 'Hard', 'Expert'])
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Expert';

  @ApiProperty({ minimum: 1, example: 3 })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({
    minimum: 0,
    nullable: true,
    description: 'Omit or null for free peer treks',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number | null;

  @ApiProperty({ minimum: 1, example: 12 })
  @IsInt()
  @Min(1)
  totalSeats: number;

  @ApiProperty({ example: '2026-12-01' })
  @IsDateString()
  dateStart: string;

  @ApiProperty({ example: '2026-12-05' })
  @IsDateString()
  dateEnd: string;

  @ApiPropertyOptional({ type: [ItineraryDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @ApiPropertyOptional({ enum: ['Low Impact', 'Regenerative'] })
  @IsOptional()
  @IsIn(['Low Impact', 'Regenerative'])
  ecoRating?: 'Low Impact' | 'Regenerative';
}
