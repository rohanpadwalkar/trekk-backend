import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

// StorageService is provided globally by StorageModule (see app.module.ts).
@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
