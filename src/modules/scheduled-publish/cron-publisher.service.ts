import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

@Injectable()
export class CronPublisherService {
  constructor(
    private telegramBot: TelegramBotService,
    private config: ConfigService,
  ) {}

  logger = new Logger(CronPublisherService.name);

  @Cron('* * */3 * * *')
  handleCron() {
    const adminUser = this.config.get<string>('ADMIN_USER');
    this.telegramBot.publishScheduled(adminUser);
  }
}
