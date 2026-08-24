import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: StorageService,
      useFactory: (config: ConfigService) =>
        new StorageService({
          endpoint: config.get<string>('storage.endpoint')!,
          region: config.get<string>('storage.region')!,
          accessKeyId: config.get<string>('storage.accessKeyId')!,
          secretAccessKey: config.get<string>('storage.secretAccessKey')!,
          forcePathStyle: config.get<boolean>('storage.forcePathStyle')!,
          publicUrl: config.get<string>('storage.publicUrl')!,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
