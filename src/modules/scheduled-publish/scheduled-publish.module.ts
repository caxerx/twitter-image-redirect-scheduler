import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileCacheModule } from '../file-cache/file-cache.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { TwitterFetcherModule } from '../twitter-fetcher/twitter-fetcher.module';
import { CronPublisherService } from './cron-publisher.service';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    TelegramBotModule,
    TwitterFetcherModule,
    FileCacheModule,
  ],
  providers: [SchedulerService, CronPublisherService],
  exports: [SchedulerService, CronPublisherService],
})
export class ScheduledPublishModule {}
