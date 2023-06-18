export type FileType = 'images' | 'videos';
export interface BufferFile {
  type: FileType;
  data: Buffer;
}
