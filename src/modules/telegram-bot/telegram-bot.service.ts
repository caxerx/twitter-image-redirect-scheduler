import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { GentleError } from 'src/models/GentleError';
import { parseTweetId } from 'src/utils/twitter';
import { Context, Telegraf } from 'telegraf';
import {
  InputMediaPhoto,
  InputMediaVideo,
} from 'telegraf/typings/core/types/typegram';
import { SchedulerService } from '../scheduled-publish/scheduler.service';
import { BufferFile } from '../file-cache/file-cache.types';
import { RecordService } from '../prisma/record.service';
import { FileCacheService } from '../file-cache/file-cache.service';
import { TwitterFetcherService } from '../twitter-fetcher/twitter-fetcher.service';

@Injectable()
export class TelegramBotService {
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private config: ConfigService,
    private scheduler: SchedulerService,
    private record: RecordService,
    private fileCache: FileCacheService,
    private twitterFetcher: TwitterFetcherService,
  ) {}

  private logger = new Logger(TelegramBotService.name);

  async sendToChannel(url: string, files: BufferFile[]) {
    const channel = this.config.get<string>('SEND_TO_CHAT');

    const inputFiles: (InputMediaPhoto | InputMediaVideo)[] = files.map(
      (i, index) => ({
        caption: index === 0 ? url : undefined,
        type: i.type === 'images' ? 'photo' : 'video',
        media: {
          source: i.data,
        },
      }),
    );

    this.bot.telegram.sendMediaGroup(channel, [...inputFiles]);
  }

  async sendToUser(userId: number | string, message: string) {
    await this.bot.telegram.sendMessage(userId, message);
  }

  async deleteScheduled(tweetId: string, feedbackUserId: string | number) {
    try {
      const record = await this.record.record({
        id: tweetId,
      });

      if (!record || record.published) {
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          'Tweet not found or already published.',
        );

        return;
      }

      await this.fileCache.removeFiles(tweetId);

      await this.record.deleteRecord({
        id: tweetId,
      });

      await this.bot.telegram.sendMessage(feedbackUserId, 'Record Deleted!');
    } catch (e) {
      if (e instanceof GentleError) {
        await this.bot.telegram.sendMessage(feedbackUserId, e.gentleMessage);
      } else {
        this.logger.error(e, e.stack);
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          'Failed to delete! Check logs for more info.',
        );
      }
    }
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
        this.logger.error(e, e.stack);
        await this.bot.telegram.sendMessage(
          feedbackUserId,
          'Failed to publish! Check logs for more info.',
        );
      }
    }
  }

  async scheduleUrl(pureTweetUrl: string, userId: string | number) {
    const tweetId = parseTweetId(pureTweetUrl);
    const scraper = this.twitterFetcher.getRawScraper();
    const tweet = await scraper.getTweet(tweetId);

    try {
      const count = await this.scheduler.scheduleTweeterPost(
        tweet.isRetweet ? tweet.retweetedStatus : tweet,
      );

      await this.bot.telegram.sendMessage(
        userId,
        `Scheduled! Remain: ${count}`,
      );
    } catch (e) {
      if (e instanceof GentleError) {
        await this.bot.telegram.sendMessage(userId, e.gentleMessage);
      } else {
        this.logger.error(e, e.stack);
        this.bot.telegram.sendMessage(
          userId,
          'Failed to schedule! Check logs for more info.',
        );
      }
      return;
    }
  }
}
