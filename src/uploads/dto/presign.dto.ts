import { IsIn, IsString } from 'class-validator';
import { UploadPurpose } from '../../storage/storage.service';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const ALLOWED_PURPOSES: UploadPurpose[] = ['avatar', 'trek', 'post', 'kyc', 'chat'];

export class PresignUploadDto {
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: string;

  @IsString()
  @IsIn(ALLOWED_PURPOSES)
  purpose: UploadPurpose;
}
