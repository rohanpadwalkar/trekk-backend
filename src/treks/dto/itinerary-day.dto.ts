import { IsInt, IsString, Min } from 'class-validator';

export class ItineraryDayDto {
  @IsInt()
  @Min(1)
  day: number;

  @IsString()
  title: string;

  @IsString()
  detail: string;
}
