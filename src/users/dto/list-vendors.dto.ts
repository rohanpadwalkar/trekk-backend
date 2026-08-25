import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListVendorsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
