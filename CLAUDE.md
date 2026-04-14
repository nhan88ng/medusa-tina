# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with hot reload (http://localhost:9000)
npm run build        # Compile with medusa build → .medusa/server/

# Database
npx medusa db:migrate        # Apply all pending migrations
npx medusa db:generate       # Generate new migration files after model changes

# Seeding
npm run seed                 # Base data seed
npm run seed:vn              # Vietnam handbags product catalog
npm run seed:promotions      # Promotional campaigns

# Testing
npm run test:unit                    # Unit tests
npm run test:integration:http        # HTTP integration tests
npm run test:integration:modules     # Module integration tests

# Running a single test file
NODE_OPTIONS=--experimental-vm-modules jest --testPathPattern=<file> --runInBand
```

Admin UI runs at `http://localhost:5173` during development.

Redis is optional in development (falls back to in-memory). Required for production.

## Architecture Overview

This is a **Medusa v2 e-commerce backend** for a Vietnamese fashion handbag store, with extensive custom modules and admin customizations.

### Custom Modules (`src/modules/`)

Each module follows: `model.ts` → `service.ts` → `migrations/` → `index.ts`.

| Module | Purpose |
|--------|---------|
| `brand` | Brand entities linked to products |
| `seo` | SEO metadata (title, description, OG) for products/categories/collections/brands |
| `entity-content` | Rich HTML content (Tiptap) for products/categories/collections |
| `email-template` | Admin-managed Handlebars email templates |
| `product-review` | Customer reviews with rating and moderation |
| `wishlist` | Customer wishlists |
| `meilisearch` | Vietnamese-aware full-text product search |
| `payment-cod` | Cash on Delivery (auto-authorizes) |
| `payment-bank-transfer` | Manual bank transfer with admin confirmation |
| `email-notification` | Gmail OAuth2 transactional email provider |

### Module Links (`src/links/`)

Links establish relationships between module entities without foreign keys in models. For example, `product-brand.ts` links Medusa's `Product` to the custom `Brand` entity.

### API Routes (`src/api/`)

File-based routing. Two namespaces:
- `/admin/*` — requires admin auth (via Medusa's built-in auth)
- `/store/*` — public or customer-auth endpoints (require `x-publishable-api-key` header)

Request validation is defined in `validators.ts` files (Zod schemas) and registered in `src/api/middlewares.ts`.

### Workflows (`src/workflows/`)

Durable step-based orchestration for all write operations. Each business entity has create/update/delete workflows. Always use workflows instead of calling services directly from API routes.

### Subscribers (`src/subscribers/`)

Event-driven handlers. Main patterns:
- `order.*` events → transactional emails via the notification module
- `product.created/updated/deleted` → MeiliSearch index sync

### Jobs (`src/jobs/`)

Background tasks: MeiliSearch index setup on startup, scheduled review request emails, abandoned cart recovery.

### Admin Dashboard (`src/admin/`)

React-based customizations using Medusa Admin SDK and `@medusajs/ui`. Structure:
- `widgets/` — injected into existing admin detail pages (product, category, collection, order)
- `routes/` — full custom management pages (brands, reviews, search, email templates, Nhanh sync)
- `components/` — shared components (Tiptap rich text editor, SEO fields, entity content sections)

Admin UI is English only. Vietnamese text only appears in storefront-facing content.

### Nhanh.vn Integration (`src/lib/nhanh.ts`, `src/api/admin/nhanh-sync/`)

Integration with Nhanh.vn POS/inventory system for syncing products, categories, and brands. Uses `NHANH_APP_ID`, `NHANH_BUSINESS_ID`, `NHANH_ACCESS_TOKEN` env vars.

### Key Configuration

- `medusa-config.ts` — registers all modules, payment providers, file storage, Redis
- Redis modules auto-enable when `REDIS_URL` is set; fall back to in-memory otherwise
- File storage: Cloudflare R2 (S3-compatible), configured via `S3_*` env vars
- Database SSL is enabled by default unless `DATABASE_SSL=false`

### Storefront Integration

See `STOREFRONT_INTEGRATION.md` for all custom store API endpoint schemas and SDK usage patterns. **Always update this file when adding new store API endpoints.**
