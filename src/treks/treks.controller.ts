import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TreksService } from './treks.service';
import { CreateTrekDto } from './dto/create-trek.dto';
import { UpdateTrekDto } from './dto/update-trek.dto';
import { ListTreksDto } from './dto/list-treks.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('treks')
@ApiBearerAuth('access-token')
@Controller('treks')
export class TreksController {
  constructor(private treksService: TreksService) {}

  @Public()
  @Get()
  async findAll(@Query() filters: ListTreksDto) {
    return this.treksService.findAll(filters);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.treksService.findById(id);
  }

  // No @Roles() here — vendor-vs-peer eligibility depends on the request
  // body (organizerType), not a fixed role, so the check happens inside
  // TreksService.create() where the actual dto is visible.
  @Post()
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreateTrekDto) {
    return this.treksService.create(userId, dto);
  }

  @Patch(':id')
  async update(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: UpdateTrekDto) {
    return this.treksService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    await this.treksService.remove(userId, id);
  }
}
