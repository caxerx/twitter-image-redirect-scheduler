import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GentleError } from 'src/models/GentleError';
import { FileCacheService } from '../file-cache/file-cache.service';
import { Scraper, Tweet } from '@the-convocation/twitter-scraper';
import { BufferFile } from '../file-cache/file-cache.types';
import * as fs from 'fs';
import * as tough from 'tough-cookie';

@Injectable()
export class TwitterFetcherService {
  private scraper: Scraper;
  private lastRetweetedId: string;

  constructor(
    private config: ConfigService,
    private fileCache: FileCacheService,
  ) {
    this.scraper = new Scraper();
    this.login();
  }

  private async login() {
    if (fs.existsSync('cookie.json')) {
      this.logger.log('Logging in Twitter using cookie');
      await this.scraper.setCookies(
        JSON.parse(fs.readFileSync('cookie.json').toString()).map((i) =>
          tough.Cookie.fromJSON(i),
        ),
      );
    } else {
      this.logger.log('Logging in Twitter using username and password');
      await this.scraper.login(
        this.config.get('TWITTER_USERNAME'),
        this.config.get('TWITTER_PASSWORD'),
      );

      fs.writeFileSync(
        'cookie.json',
        JSON.stringify(await this.scraper.getCookies()),
      );
    }

    if (await this.scraper.isLoggedIn()) {
      this.logger.log('Logged in successfully');
      setTimeout(() => {
        this.logLastRetweets();
      }, 1000);
    } else {
      this.logger.error('Failed to login');
    }
  }

  private logger = new Logger(TwitterFetcherService.name);

  async logLastRetweets() {
    const lastRetweet = this.scraper.getTweets(
      this.config.get('TWITTER_RETWEET_TRACKER_USERNAME'),
    );

    for await (const tweet of lastRetweet) {
      if (tweet.isRetweet) {
        this.lastRetweetedId = tweet.id;
        break;
      }
    }

    this.logger.log(`Last retweeted id: ${this.lastRetweetedId}`);
  }

  getRawScraper() {
    return this.scraper;
  }

  async fetchLastRetweets() {
    if (!this.lastRetweetedId) {
      return [];
    }

    const tweets = this.scraper.getTweets(
      this.config.get('TWITTER_RETWEET_TRACKER_USERNAME'),
    );

    let latestRetweet: string = null;
    const tweetList: Tweet[] = [];

    for await (const tweet of tweets) {
      if (tweet.isRetweet) {
        if (tweet.id === this.lastRetweetedId) {
          break;
        }

        if (!latestRetweet) {
          latestRetweet = tweet.id;
        }

        tweetList.push(tweet);
      }
    }

    this.lastRetweetedId = latestRetweet ?? this.lastRetweetedId;

    return tweetList;
  }

  async getTweetImages(tweet: Tweet): Promise<string[]> {
    if (tweet.photos?.length <= 0) {
      return [];
    }

    return tweet.photos.map((i) => i.url);
  }

  async getTweetVideos(tweet: Tweet): Promise<string[]> {
    if (tweet.videos?.length <= 0) {
      return [];
    }
    return tweet.videos.map((i) => i.url);
  }

  async cacheTweet(tweet: Tweet): Promise<void> {
    const tweetId = tweet.id;
    const tweetUser = tweet.username;

    const imageUrls = await this.getTweetImages(tweet);
    const videoUrls = await this.getTweetVideos(tweet);

    if (imageUrls.length === 0 && videoUrls.length === 0) {
      throw new GentleError(
        `No images or videos found for tweet: https://x.com/${tweetUser}/status/${tweetId}`,
      );
    }

    const imagePromises = imageUrls.map(async (imageUrl) => {
      try {
        const image = await fetch(imageUrl);
        return Buffer.from(await image.arrayBuffer());
      } catch (e) {
        this.logger.error(e, e.stack);
        throw new GentleError(
          `Failed to fetch image for tweet: https://x.com/${tweetUser}/status/${tweetId}`,
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
          `Failed to fetch video for tweet: https://x.com/${tweetUser}/status/${tweetId}`,
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
        `Failed to write files for tweet: https://x.com/${tweetUser}/status/${tweetId}`,
      );
    }
  }
}
