import { forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Update, Ctx, Hears, Command } from 'nestjs-telegraf';
import { removeUrlQuery } from 'src/utils/url';
import { Context } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';

@Update()
export class TelegramBotUpdate {
  constructor(
    @Inject(forwardRef(() => TelegramBotService))
    private botService: TelegramBotService,
    private config: ConfigService,
  ) {}

  @Hears(/^https\:\/\/twitter\.com\/.*$/)
  async hears(@Ctx() ctx: Context) {
    if (!('text' in ctx.message)) {
      return;
    }

    const from = ctx.message.from.id;
    if (from !== +this.config.get<string>('ADMIN_USER')) {
      return;
    }

    const messageText = ctx.message.text;
    const pureUrl = removeUrlQuery(messageText);

    await this.botService.scheduleUrl(pureUrl, from);
  }

  @Command('send')
  async send(@Ctx() ctx: Context) {
    const from = ctx.message.from.id;
    if (from !== +this.config.get<string>('ADMIN_USER')) {
      return;
    }
    await this.botService.publishScheduled(from);
  }
}
