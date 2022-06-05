import { NestFactory } from '@nestjs/core';
import { getBotToken } from 'nestjs-telegraf';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.ENV === 'PROD') {
    const bot = app.get(getBotToken());
    app.use(bot.webhookCallback('/waifu'));
  }
  await app.listen(3000);
}
bootstrap();
