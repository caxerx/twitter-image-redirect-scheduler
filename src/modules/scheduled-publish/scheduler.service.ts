import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GentleError } from 'src/models/GentleError';
import { FileCacheService } from '../file-cache/file-cache.service';
import { RecordService } from '../prisma/record.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TwitterFetcherService } from '../twitter-fetcher/twitter-fetcher.service';

@Injectable()
export class SchedulerService {
  constructor(
    private recordService: RecordService,
    private twitterFetcher: TwitterFetcherService,
    @Inject(forwardRef(() => TelegramBotService))
    private telegramBot: TelegramBotService,
    private fileCache: FileCacheService,
  ) {}

  private logger = new Logger(SchedulerService.name);

  async schedule(record: Prisma.RecordCreateInput) {
    try {
      await this.recordService.createRecord(record);
    } catch (e) {
      if ('code' in e && e.code === 'P2002') {
        throw new GentleError('This tweet is already scheduled');
      } else {
        this.logger.error(e);
      }
      throw e;
    }

    try {
      await this.twitterFetcher.fetchAndCacheTweet(record.id);
    } catch (e) {
      await this.recordService.deleteRecord({
        id: record.id,
      });
      throw e;
    }

    return await this.recordService.count({
      published: false,
    });
  }

  async publish() {
    const resp = await this.recordService.records({
      where: {
        published: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 1,
    });

    if (resp.length === 0) {
      return -1;
    }

    const tweet = resp[0];
    const tweetId = tweet.id;

    try {
      const files = await this.fileCache.getImages(tweetId);
      await this.telegramBot.sendToChannel(tweet.url, files);
    } catch (e) {
      this.logger.error(e);
      throw new GentleError('Failed to send tweet to telegram channel');
    }

    const removeImagePromise = this.fileCache.removeImages(tweetId);

    const updateRecordPromise = this.recordService.updateRecord({
      where: {
        id: tweetId,
      },
      data: {
        published: true,
      },
    });

    await Promise.all([removeImagePromise, updateRecordPromise]);

    return this.recordService.count({
      published: false,
    });
  }
}
