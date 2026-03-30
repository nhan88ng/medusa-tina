FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.medusa/server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.medusa/server .

EXPOSE 9000

CMD ["node", "index.js"]
