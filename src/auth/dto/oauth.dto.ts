import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleOAuthDto {
  @ApiProperty({ description: 'ID token from the native Google SDK' })
  @IsString()
  idToken: string;
}

export class AppleOAuthDto {
  @ApiProperty({ description: 'Identity token from the native Apple SDK' })
  @IsString()
  identityToken: string;
}
