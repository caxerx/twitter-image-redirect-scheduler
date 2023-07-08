FROM node:18 as base

RUN npm install -g pnpm

# BUILDER

FROM base as builder

WORKDIR /usr/src/app

COPY . .

RUN pnpm i --frozen-lockfile
RUN pnpm build

# BASE

FROM base

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm i --production --frozen-lockfile

COPY --from=builder /usr/src/app/dist ./dist
RUN pnpx prisma generate

# CONFIG

EXPOSE 3000

CMD ["node" , "dist/main.js"]

VOLUME ["/usr/src/app/files"]

ENV DATABASE_URL=
ENV TELEGRAM_BOT_TOKEN=
ENV TWITTER_USERNAME=
ENV TWITTER_PASSWORD=
ENV SEND_TO_CHAT=
ENV ADMIN_USER=
ENV ENV=
ENV WEBHOOK_URL=
ENV TWITTER_RETWEET_TRACKER_USERNAME=

USER node