import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GentleError } from 'src/models/GentleError';
import { FileCacheService } from '../file-cache/file-cache.service';
import { Scraper } from '@the-convocation/twitter-scraper';
import { BufferFile } from '../file-cache/file-cache.types';

@Injectable()
export class TwitterFetcherService {
  private scraper: Scraper;
  constructor(config: ConfigService, private fileCache: FileCacheService) {
    this.scraper = new Scraper();
    this.scraper.login(
      config.get('TWITTER_USERNAME'),
      config.get('TWITTER_PASSWORD'),
    );
  }

  private logger = new Logger(TwitterFetcherService.name);

  async getTweetImages(tweetId: string): Promise<string[]> {
    const tweet = await this.scraper.getTweet(tweetId, false);

    if (tweet.photos?.length <= 0) {
      return [];
    }

    return tweet.photos.map((i) => i.url);
  }

  async getTweetVideos(tweetId: string): Promise<string[]> {
    const tweet = await this.scraper.getTweet(tweetId, false);

    if (tweet.videos?.length <= 0) {
      return [];
    }
    return tweet.videos.map((i) => i.url);
  }

  async fetchAndCacheTweet(tweetId: string): Promise<void> {
    const imageUrls = await this.getTweetImages(tweetId);
    const videoUrls = await this.getTweetVideos(tweetId);

    if (imageUrls.length === 0 && videoUrls.length === 0) {
      throw new GentleError(
        `No images or videos found for tweet: https://twitter.com/_/status/${tweetId}`,
      );
    }

    const imagePromises = imageUrls.map(async (imageUrl) => {
      try {
        const image = await fetch(imageUrl);
        return Buffer.from(await image.arrayBuffer());
      } catch (e) {
        this.logger.error(e, e.stack);
        throw new GentleError(
          `Failed to fetch image for tweet: https://twitter.com/_/status/${tweetId}`,
        );
      }
    });

    const videoPromises = videoUrls.map(async (videoUrl) => {
      try {
        const video = await fetch(videoUrl);
        return Buffer.from(await video.arrayBuffer());
      } catch (e) {
        this.logger.error(e, e.stack);
        throw new GentleError(
          `Failed to fetch video for tweet: https://twitter.com/_/status/${tweetId}`,
        );
      }
    });

    const images: BufferFile[] = (await Promise.all(imagePromises)).map(
      (i) => ({
        type: 'images',
        data: i,
      }),
    );

    const videos: BufferFile[] = (await Promise.all(videoPromises)).map(
      (i) => ({
        type: 'videos',
        data: i,
      }),
    );

    try {
      await this.fileCache.cacheFiles(tweetId, [...images, ...videos]);
    } catch (e) {
      this.logger.error(e, e.stack);
      throw new GentleError(
        `Failed to write files for tweet: https://twitter.com/_/status/${tweetId}`,
      );
    }
  }
}
