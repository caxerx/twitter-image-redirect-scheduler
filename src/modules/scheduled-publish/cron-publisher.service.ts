import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TwitterFetcherService } from '../twitter-fetcher/twitter-fetcher.service';

@Injectable()
export class CronPublisherService {
  constructor(
    private twitterFetcher: TwitterFetcherService,
    private telegramBot: TelegramBotService,
    private config: ConfigService,
  ) {}

  logger = new Logger(CronPublisherService.name);

  @Cron('0 0 */3 * * *')
  publishTweet() {
    const adminUser = this.config.get<string>('ADMIN_USER');
    this.telegramBot.publishScheduled(adminUser);
  }

  @Cron('0 */5 * * * *')
  // @Cron('*/10 * * * * *')
  async scheduleAllRetweeted() {
    const adminUser = this.config.get<string>('ADMIN_USER');

    const tweets = await this.twitterFetcher.fetchLastRetweets();

    const scheduleJobs = tweets.map(async (tweet) => {
      return this.telegramBot.scheduleUrl(tweet.permanentUrl, adminUser);
    });

    const scheduledJobsResult = await Promise.allSettled(scheduleJobs);

    const failedJobs = scheduledJobsResult.filter(
      (i) => i.status === 'rejected',
    );

    if (failedJobs.length > 0) {
      this.logger.error(
        `Failed to schedule ${failedJobs.length} jobs. ${JSON.stringify(
          failedJobs,
        )}`,
      );
    } else if (tweets.length > 0) {
      this.logger.log(`Scheduled ${tweets.length} jobs`);
    }
  }
}
