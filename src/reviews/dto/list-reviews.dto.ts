import { IsIn, IsMongoId } from 'class-validator';

export class ListReviewsDto {
  @IsIn(['trek', 'user'])
  targetType: 'trek' | 'user';

  @IsMongoId()
  targetId: string;
}
