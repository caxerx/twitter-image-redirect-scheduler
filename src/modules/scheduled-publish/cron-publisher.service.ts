import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TwitterFetcherService } from '../twitter-fetcher/twitter-fetcher.service';
import { Tweet } from '@the-convocation/twitter-scraper';

@Injectable()
export class CronPublisherService {
  constructor(
    private twitterFetcher: TwitterFetcherService,
    private telegramBot: TelegramBotService,
    private config: ConfigService,
  ) {}

  logger = new Logger(CronPublisherService.name);

  @Cron('0 0 */1 * * *')
  publishTweet() {
    const adminUser = this.config.get<string>('ADMIN_USER');
    this.telegramBot.publishScheduled(adminUser);
  }

  @Cron('0 */5 * * * *')
  // @Cron('*/10 * * * * *')
  async scheduleAllRetweeted() {
    const adminUser = this.config.get<string>('ADMIN_USER');

    const tweets = await this.twitterFetcher.fetchLastRetweets();

    const failedJobs: Tweet[] = [];

    for (const tweet of tweets) {
      try {
        await this.telegramBot.scheduleTweet(tweet, adminUser);
      } catch (e) {
        failedJobs.push(tweet);
      }
    }

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
