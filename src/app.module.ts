import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule, TelegrafModuleOptions } from 'nestjs-telegraf';
import { FileCacheModule } from './modules/file-cache/file-cache.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ScheduledPublishModule } from './modules/scheduled-publish/scheduled-publish.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { TwitterFetcherModule } from './modules/twitter-fetcher/twitter-fetcher.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    FileCacheModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let config: TelegrafModuleOptions = {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        };

        if (configService.get<string>('ENV') === 'PROD') {
          config = {
            ...config,
            launchOptions: {
              webhook: {
                domain: configService.get<string>('WEBHOOK_URL'),
                hookPath: '/waifu',
              },
            },
          };
        }

        return config;
      },
      inject: [ConfigService],
    }),
    TwitterFetcherModule,
    TelegramBotModule,
    ScheduledPublishModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
