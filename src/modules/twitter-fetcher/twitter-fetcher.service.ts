import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GentleError } from 'src/models/GentleError';
import { TwitterApi, TwitterApiReadOnly } from 'twitter-api-v2';
import { FileCacheService } from '../file-cache/file-cache.service';

@Injectable()
export class TwitterFetcherService {
  twitterClient: TwitterApi;
  roClient: TwitterApiReadOnly;
  constructor(config: ConfigService, private fileCache: FileCacheService) {
    this.twitterClient = new TwitterApi(config.get<string>('TWITTER_TOKEN'));
    this.roClient = this.twitterClient.readOnly;
  }

  private logger = new Logger(TwitterFetcherService.name);

  async getTweetImages(tweetId: string): Promise<string[]> {
    const result = await this.roClient.v2.singleTweet(tweetId, {
      expansions: ['attachments.media_keys'],
      'tweet.fields': ['attachments'],
      'media.fields': ['url'],
    });

    if (!result.includes?.media) {
      return [];
    }

    return result.includes.media.filter((i) => i.url).map((i) => i.url);
  }

  async fetchAndCacheTweet(tweetId: string): Promise<void> {
    const tweet = await this.getTweetImages(tweetId);
    if (tweet.length === 0) {
      throw new GentleError(
        `No images found for tweet: https://twitter.com/_/status/${tweetId}`,
      );
    }

    const imagePromises = tweet.map(async (imageUrl) => {
      try {
        const image = await fetch(imageUrl);
        return Buffer.from(await image.arrayBuffer());
      } catch (e) {
        this.logger.error(e);
        throw new GentleError(
          `Failed to fetch image for tweet: https://twitter.com/_/status/${tweetId}`,
        );
      }
    });

    const images = await Promise.all(imagePromises);

    try {
      await this.fileCache.cacheImages(tweetId, images);
    } catch (e) {
      this.logger.error(e);
      throw new GentleError(
        `Failed to write images for tweet: https://twitter.com/_/status/${tweetId}`,
      );
    }
  }
}
