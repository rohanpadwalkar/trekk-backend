import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'Asha Trekker', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'trekker@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @ApiProperty({
    type: [String],
    enum: ['trekker', 'vendor'],
    isArray: true,
    example: ['trekker'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['trekker', 'vendor'], { each: true })
  roles: Array<'trekker' | 'vendor'>;
}
