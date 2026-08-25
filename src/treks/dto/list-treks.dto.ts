import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTreksDto {
  @ApiPropertyOptional({ description: 'Free-text match against title/location' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ enum: ['Easy', 'Moderate', 'Hard', 'Expert'] })
  @IsOptional()
  @IsIn(['Easy', 'Moderate', 'Hard', 'Expert'])
  difficulty?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  availableSeatsOnly?: boolean;

  @ApiPropertyOptional({ enum: ['Low Impact', 'Regenerative'] })
  @IsOptional()
  @IsIn(['Low Impact', 'Regenerative'])
  ecoRating?: string;

  @ApiPropertyOptional({ enum: ['vendor', 'peer'] })
  @IsOptional()
  @IsIn(['vendor', 'peer'])
  organizerType?: 'vendor' | 'peer';
}
