import { ArrayMaxSize, IsArray, IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ enum: ['photo', 'peer-trek'] })
  @IsIn(['photo', 'peer-trek'])
  type: 'photo' | 'peer-trek';

  @ApiProperty({ type: [String], maxItems: 10, description: 'Object storage keys' })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Trek ObjectId this post is linked to, if any' })
  @IsOptional()
  @IsMongoId()
  trekId?: string;
}
