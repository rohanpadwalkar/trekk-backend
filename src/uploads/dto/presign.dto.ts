import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UploadPurpose } from '../../storage/storage.service';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const ALLOWED_PURPOSES: UploadPurpose[] = ['avatar', 'trek', 'post', 'kyc', 'chat'];

export class PresignUploadDto {
  @ApiProperty({ enum: ALLOWED_CONTENT_TYPES })
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: string;

  @ApiProperty({ enum: ALLOWED_PURPOSES })
  @IsString()
  @IsIn(ALLOWED_PURPOSES)
  purpose: UploadPurpose;
}
