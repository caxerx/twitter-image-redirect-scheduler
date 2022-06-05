import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';

@Injectable()
export class FileCacheService {
  async cacheImages(id: string, images: Buffer[]) {
    await mkdir(`./images/${id}`, { recursive: true });

    images.map(async (image, index) => {
      await writeFile(`./images/${id}/${index}`, image);
    });
  }

  async getImages(id: string) {
    const fileNames = await readdir(`./images/${id}`);
    const filePromises = fileNames.map((file) =>
      readFile(`./images/${id}/${file}`),
    );

    const files = await Promise.all(filePromises);

    return files;
  }

  async removeImages(id: string) {
    await rm(`./images/${id}`, { recursive: true });
  }
}
