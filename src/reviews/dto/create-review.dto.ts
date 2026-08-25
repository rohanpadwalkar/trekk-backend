import { IsIn, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ enum: ['trek', 'user'] })
  @IsIn(['trek', 'user'])
  targetType: 'trek' | 'user';

  @ApiProperty({ description: 'ObjectId of the trek or user being reviewed' })
  @IsMongoId()
  targetId: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;
}
