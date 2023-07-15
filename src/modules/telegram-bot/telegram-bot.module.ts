import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduledPublishModule } from '../scheduled-publish/scheduled-publish.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';
import { PrismaModule } from '../prisma/prisma.module';
import { FileCacheModule } from '../file-cache/file-cache.module';
import { TwitterFetcherModule } from '../twitter-fetcher/twitter-fetcher.module';

@Module({
  imports: [
    PrismaModule,
    FileCacheModule,
    ConfigModule,
    TelegrafModule,
    TwitterFetcherModule,
    forwardRef(() => ScheduledPublishModule),
  ],
  providers: [TelegramBotUpdate, TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
