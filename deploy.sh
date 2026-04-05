#!/bin/bash
set -e

echo "=== [1/4] Building..."
npm run build

echo "=== [2/4] Running database migrations..."
npx medusa db:migrate

echo "=== [3/4] Seeding data (idempotent — safe to re-run)..."
npm run seed:vn
npm run seed:promotions

echo "=== [4/4] Starting server..."
npm run start
