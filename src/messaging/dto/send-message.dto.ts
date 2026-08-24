import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ValidateIf((o) => !o.imageUrl)
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
