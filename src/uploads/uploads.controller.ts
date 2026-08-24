import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../storage/storage.service';
import { PresignUploadDto } from './dto/presign.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('uploads')
@ApiBearerAuth('access-token')
@Controller('uploads')
export class UploadsController {
  constructor(private storageService: StorageService) {}

  @Post('presign')
  async presign(@CurrentUser('userId') userId: string, @Body() dto: PresignUploadDto) {
    return this.storageService.presignUpload(dto.purpose, dto.contentType, userId);
  }
}
