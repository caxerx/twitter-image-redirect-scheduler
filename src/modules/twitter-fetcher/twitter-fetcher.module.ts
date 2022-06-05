import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileCacheModule } from '../file-cache/file-cache.module';
import { TwitterFetcherService } from './twitter-fetcher.service';

@Module({
  providers: [TwitterFetcherService],
  exports: [TwitterFetcherService],
  imports: [ConfigModule, FileCacheModule],
})
export class TwitterFetcherModule {}
