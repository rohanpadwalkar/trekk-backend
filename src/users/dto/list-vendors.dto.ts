import { IsOptional, IsString } from 'class-validator';

export class ListVendorsDto {
  @IsOptional()
  @IsString()
  location?: string;
}
