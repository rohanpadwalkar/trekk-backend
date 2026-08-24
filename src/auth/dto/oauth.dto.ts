import { IsString } from 'class-validator';

export class GoogleOAuthDto {
  @IsString()
  idToken: string;
}

export class AppleOAuthDto {
  @IsString()
  identityToken: string;
}
