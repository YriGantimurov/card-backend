FROM node:26.13.0-bookworm

WORKDIR /app/backend
COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
RUN npm run build

USER node
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
