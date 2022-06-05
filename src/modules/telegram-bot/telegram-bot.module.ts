import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduledPublishModule } from '../scheduled-publish/scheduled-publish.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';

@Module({
  imports: [
    ConfigModule,
    TelegrafModule,
    forwardRef(() => ScheduledPublishModule),
  ],
  providers: [TelegramBotUpdate, TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
