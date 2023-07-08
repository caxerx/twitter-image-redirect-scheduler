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

  // @Cron('0 */1 * * * *')
  // async fetchThings() {
  //   const tweets = this.twitterFetcher.fetchLastRetweets();

  //   for await (const tweet of tweets) {
  //     console.log(tweet);
  //   }

  //   console.log('Done');
  // }
}
