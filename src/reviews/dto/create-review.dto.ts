import { IsIn, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsIn(['trek', 'user'])
  targetType: 'trek' | 'user';

  @IsMongoId()
  targetId: string;

  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  text?: string;
}
