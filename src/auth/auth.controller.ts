import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleOAuthDto, AppleOAuthDto } from './dto/oauth.dto';
import { RefreshDto, LogoutDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Auth endpoints are brute-force targets, so they get a tighter throttle
// than the app-wide default (set in app.module.ts).
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const { user, tokens } = await this.authService.signup(dto);
    return { user, ...tokens };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto);
    return { user, ...tokens };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('oauth/google')
  async googleOauth(@Body() dto: GoogleOAuthDto) {
    const { user, tokens } = await this.authService.loginWithGoogle(dto.idToken);
    return { user, ...tokens };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('oauth/apple')
  async appleOauth(@Body() dto: AppleOAuthDto) {
    const { user, tokens } = await this.authService.loginWithApple(dto.identityToken);
    return { user, ...tokens };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('session')
  async session(@CurrentUser('userId') userId: string) {
    const user = await this.authService.getSession(userId);
    return { user };
  }
}
