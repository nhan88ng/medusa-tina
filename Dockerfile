FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN NODE_OPTIONS=--max-old-space-size=2048 npm run build
RUN ls -la .medusa/server/

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.medusa/server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.medusa/server .

ENV SEED_ON_START=false

EXPOSE 9000

CMD ["sh", "-c", "npx medusa db:migrate && if [ \"$SEED_ON_START\" = \"true\" ]; then npx medusa exec ./src/scripts/seed-vn-handbags.ts; fi && npm run start"]
