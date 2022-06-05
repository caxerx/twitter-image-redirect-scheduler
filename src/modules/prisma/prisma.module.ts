import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RecordService } from './record.service';

@Module({
  providers: [PrismaService, RecordService],
  exports: [PrismaService, RecordService],
})
export class PrismaModule {}
