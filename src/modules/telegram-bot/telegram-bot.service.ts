import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecordType } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { GentleError } from 'src/models/GentleError';
import { parseTweetId } from 'src/utils/twitter';
import { Context, Telegraf } from 'telegraf';
import { InputMediaPhoto } from 'telegraf/typings/core/types/typegram';
import { SchedulerService } from '../scheduled-publish/scheduler.service';

@Injectable()
export class TelegramBotService {
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private config: ConfigService,
    private scheduler: SchedulerService,
  ) {}

  private logger = new Logger(TelegramBotService.name);

  async sendToChannel(url: string, files: Buffer[]) {
    const channel = this.config.get<string>('SEND_TO_CHAT');

    const inputFiles: InputMediaPhoto[] = files.map((i, index) => ({
      caption: index === 0 ? url : undefined,
      type: 'photo',
      media: {
        source: i,
      },
    }));

    this.bot.telegram.sendMediaGroup(channel, [...inputFiles]);
  }

  async sendToUser(userId: number | string, message: string) {
    await this.bot.telegram.sendMessage(userId, message);
  }

  async publishScheduled(feedbackUserId: string | number) {
    try {
      const remain = await this.scheduler.publish();
      if (remain >= 0) {
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          `Sent! Remain: ${remain}`,
        );
      } else {
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          'No more scheduled tweets.',
        );
      }
    } catch (e) {
      if (e instanceof GentleError) {
        await this.bot.telegram.sendMessage(feedbackUserId, e.gentleMessage);
      } else {
        this.logger.error(e);
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          'Failed to publish! Check logs for more info.',
        );
      }
    }
  }

  async scheduleUrl(pureTweetUrl: string, userId: string | number) {
    const tweetId = parseTweetId(pureTweetUrl);

    try {
      const count = await this.scheduler.schedule({
        id: tweetId,
        url: pureTweetUrl,
        type: RecordType.TWITTER,
      });

      await this.bot.telegram.sendMessage(
        userId,
        `Scheduled! Remain: ${count}`,
      );
    } catch (e) {
      if (e instanceof GentleError) {
        await this.bot.telegram.sendMessage(userId, e.gentleMessage);
      } else {
        this.logger.error(e);
        this.bot.telegram.sendMessage(
          userId,
          'Failed to schedule! Check logs for more info.',
        );
      }
      return;
    }
  }
}
