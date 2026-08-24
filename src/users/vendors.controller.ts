import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ListVendorsDto } from './dto/list-vendors.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('vendors')
@Public()
@Controller('vendors')
export class VendorsController {
  constructor(private usersService: UsersService) {}

  @Get()
  async list(@Query() dto: ListVendorsDto) {
    return this.usersService.listVendors(dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findVendorById(id);
  }
}
