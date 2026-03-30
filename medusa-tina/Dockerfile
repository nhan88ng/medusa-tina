FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN DISABLE_ADMIN=true NODE_OPTIONS=--max-old-space-size=2048 npm run build
RUN ls -la .medusa/server/

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.medusa/server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.medusa/server .

EXPOSE 9000

CMD ["npm", "run", "start"]
