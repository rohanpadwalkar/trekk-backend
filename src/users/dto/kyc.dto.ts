import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitKycDto {
  @ApiProperty({ example: 'aadhaar', description: "e.g. 'aadhaar', 'passport', 'drivers-license'" })
  @IsString()
  docType: string;

  @ApiProperty({ description: "Object key from POST /uploads/presign with purpose: 'kyc'" })
  @IsString()
  docKey: string;
}
