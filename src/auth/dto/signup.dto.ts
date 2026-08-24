import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['trekker', 'vendor'], { each: true })
  roles: Array<'trekker' | 'vendor'>;
}
