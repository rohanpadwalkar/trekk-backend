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
import { ItineraryDayDto } from './itinerary-day.dto';

export class CreateTrekDto {
  @IsString()
  title: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['vendor', 'peer'])
  organizerType: 'vendor' | 'peer';

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsIn(['Easy', 'Moderate', 'Hard', 'Expert'])
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Expert';

  @IsInt()
  @Min(1)
  durationDays: number;

  // Omit or null for free peer treks.
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number | null;

  @IsInt()
  @Min(1)
  totalSeats: number;

  @IsDateString()
  dateStart: string;

  @IsDateString()
  dateEnd: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @IsOptional()
  @IsIn(['Low Impact', 'Regenerative'])
  ecoRating?: 'Low Impact' | 'Regenerative';
}
