import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({ maxLength: 4000, description: 'Required unless imageUrl is set' })
  @ValidateIf((o) => !o.imageUrl)
  @IsString()
  @MaxLength(4000)
  text?: string;

  @ApiPropertyOptional({ description: 'MinIO/S3 object key for an image attachment' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
