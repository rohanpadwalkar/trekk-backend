import { ArrayMaxSize, IsArray, IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @IsIn(['photo', 'peer-trek'])
  type: 'photo' | 'peer-trek';

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images: string[];

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsMongoId()
  trekId?: string;
}
