import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { BufferFile, FileType } from './file-cache.types';

const fileRegex = /(.+)_([0-9]+)/;

@Injectable()
export class FileCacheService {
  async cacheFiles(id: string, file: BufferFile[]) {
    await mkdir(`./files/${id}`, { recursive: true });

    file.map(async (file, index) => {
      await writeFile(`./files/${id}/${file.type}_${index}`, file.data);
    });
  }

  async getFiles(id: string): Promise<BufferFile[]> {
    const fileNames = await readdir(`./files/${id}`);
    const filePromises = fileNames.map(async (file) => ({
      type: fileRegex.exec(file)[1] as FileType,
      data: await readFile(`./files/${id}/${file}`),
    }));

    const files = await Promise.all(filePromises);

    return files;
  }

  async removeFiles(id: string) {
    await rm(`./files/${id}`, { recursive: true });
  }
}
