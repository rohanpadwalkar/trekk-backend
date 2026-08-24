import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SubmitKycDto } from './dto/kyc.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // NOTE: the /me* routes are declared before the /:id route below —
  // otherwise ":id" would greedily match the literal segment "me".

  @Get('me')
  async getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  async updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(userId, dto);
  }

  @Post('me/kyc')
  async submitKyc(@CurrentUser('userId') userId: string, @Body() dto: SubmitKycDto) {
    const user = await this.usersService.submitKyc(userId, dto);
    return { kyc: user.kyc };
  }

  @Get('me/field-notes')
  async myFieldNotes(@CurrentUser('userId') userId: string) {
    return this.usersService.getFieldNotes(userId);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
