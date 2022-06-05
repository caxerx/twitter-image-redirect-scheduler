import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileCacheService } from './file-cache.service';

@Module({
  providers: [FileCacheService],
  exports: [FileCacheService],
  imports: [ConfigModule],
})
export class FileCacheModule {}
