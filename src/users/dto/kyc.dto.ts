import { IsString } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  docType: string; // e.g. 'aadhaar', 'passport', 'drivers-license'

  @IsString()
  docKey: string; // object key from POST /uploads/presign with purpose: 'kyc'
}
