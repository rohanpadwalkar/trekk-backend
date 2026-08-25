import { IsIn, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListReviewsDto {
  @ApiProperty({ enum: ['trek', 'user'] })
  @IsIn(['trek', 'user'])
  targetType: 'trek' | 'user';

  @ApiProperty({ description: 'ObjectId of the trek or user whose reviews to list' })
  @IsMongoId()
  targetId: string;
}
