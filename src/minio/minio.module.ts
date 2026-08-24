import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MinioService,
      useFactory: (config: ConfigService) =>
        new MinioService({
          endPoint: config.get<string>('minio.endPoint')!,
          port: config.get<number>('minio.port')!,
          useSSL: config.get<boolean>('minio.useSSL')!,
          accessKey: config.get<string>('minio.accessKey')!,
          secretKey: config.get<string>('minio.secretKey')!,
          publicUrl: config.get<string>('minio.publicUrl')!,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [MinioService],
})
export class MinioModule {}
