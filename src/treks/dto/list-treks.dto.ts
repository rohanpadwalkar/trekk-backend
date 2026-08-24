import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListTreksDto {
  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsIn(['Easy', 'Moderate', 'Hard', 'Expert'])
  difficulty?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  availableSeatsOnly?: boolean;

  @IsOptional()
  @IsIn(['Low Impact', 'Regenerative'])
  ecoRating?: string;

  @IsOptional()
  @IsIn(['vendor', 'peer'])
  organizerType?: 'vendor' | 'peer';
}
