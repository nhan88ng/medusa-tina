# SPEC.md — Medusa Tina Backend

> Headless e-commerce backend cho TINA SHOP (túi xách thời trang VN), built on Medusa v2.
> Spec này là source-of-truth cho scope và boundary. Cập nhật khi hướng dự án thay đổi.

---

## 1. Objective

**Phụ trách:**
- Commerce data: products, categories, collections, brands, orders, customers, cart, checkout, payment
- Đồng bộ 2 chiều với POS Nhanh.vn (pull products; push orders — future scope)
- Admin dashboard quản lý shop
- Cung cấp Store API cho storefront tiêu thụ

**KHÔNG phụ trách:** blog/pages/marketing content (→ Strapi), storefront UI (→ project riêng), online payment gateway.

**Users:**
- Admin: 1 người (owner, cũng là developer)
- End customer: gián tiếp qua storefront

---

## 2. System Context

```
┌──────────────┐       ┌────────────────┐       ┌────────────┐
│ Storefront   │──────>│  Medusa Tina   │<─────>│ Nhanh.vn   │
│ (Next.js,    │       │  (this repo)   │       │ POS        │
│  repo riêng) │──────>│                │       └────────────┘
└──────────────┘       └────────────────┘
       │                                        ┌────────────┐
       └───────────────────────────────────────>│ Strapi CMS │
                                                │ (repo riêng)│
                                                └────────────┘
```

**Nguyên tắc tích hợp:**
- Medusa ↔ Strapi: **không** kết nối trực tiếp. Storefront tự stitch data.
- Medusa ↔ Nhanh.vn: HTTP API, 2 chiều.
- Storefront ↔ Medusa: Store API (`/store/*`) + `x-publishable-api-key`.
- Strapi có thể gọi read-only `/store/products` của Medusa để làm product picker trong admin (không lưu duplicate data).

---

## 3. Storefront Choice (separate repo, not yet created)

**Next.js (App Router) + Medusa Next.js Starter.** Starter chính thức, SSR/ISR cho SEO, ecosystem lớn. Deploy Coolify hoặc Vercel.

---

## 4. Commands

```bash
# Development
npm run dev                  # http://localhost:9000, admin at :5173
npm run build                # Compile → .medusa/server/
npm start                    # Production start

# Database
npx medusa db:migrate
npx medusa db:generate <ModuleName>

# Seeding
npm run seed                 # Base (regions, currencies)
npm run seed:vn              # Vietnam handbag catalog
npm run seed:promotions

# Testing
npm run test:unit
npm run test:integration:http
npm run test:integration:modules

# Single test file
NODE_OPTIONS=--experimental-vm-modules jest --testPathPattern=<file> --runInBand

# Create admin user
npx medusa user -e <email> -p <password>
```

---

## 5. Project Structure

```
medusa-tina/
├── src/
│   ├── admin/          # React widgets/routes (English only)
│   ├── api/
│   │   ├── admin/      # /admin/* — admin auth required
│   │   └── store/      # /store/* — publishable key required
│   ├── jobs/           # Scheduled background tasks
│   ├── lib/            # Shared utilities (nhanh.ts, ...)
│   ├── links/          # Module link definitions
│   ├── modules/        # Custom modules
│   ├── scripts/        # Seed scripts
│   ├── subscribers/    # Event handlers
│   └── workflows/      # Durable orchestration
├── integration-tests/
├── medusa-config.ts
├── CLAUDE.md
├── SPEC.md
├── STOREFRONT_INTEGRATION.md
└── IMPLEMENTATION_PLAN.md
```

**Module pattern:** `src/modules/<name>/{index.ts, service.ts, models/, migrations/}`
**API routes:** file-based. `src/api/admin/brands/route.ts` → `GET /admin/brands`
**Workflows:** always called from API routes, never services directly.

---

## 6. Tech Stack

| Layer | Tool |
|-------|------|
| Runtime | Node.js ≥ 20 |
| Framework | Medusa v2 (`@medusajs/medusa` 2.13.x) |
| Language | TypeScript 5.x |
| Database | PostgreSQL (SSL on by default) |
| Cache/events/locks | Redis (optional in dev, required in prod) |
| Search | MeiliSearch (Vietnamese tokenization) |
| File storage | Cloudflare R2 via `@medusajs/medusa/file-s3` |
| Email | Gmail OAuth2 (custom `email-notification` provider) |
| Admin UI | Medusa Admin SDK + `@medusajs/ui` |
| Rich text | Tiptap |
| Testing | Jest + `@medusajs/test-utils` |
| POS integration | Nhanh.vn HTTP API |
| Deployment | Docker → Coolify on VPS (image built via GitHub Actions) |

---

## 7. Domain Model

### 7.1 Core Medusa entities (framework-provided, not redefined here)

`Product`, `ProductVariant`, `ProductCategory`, `ProductCollection`, `Customer`, `Cart`, `Order`, `PaymentCollection`, `PaymentSession`, `Region`, `SalesChannel`, `User` (admin).

### 7.2 Custom entities

| Module | Entity | Key fields | Notes |
|--------|--------|------------|-------|
| `brand` | `Brand` | `id`, `name`, `handle` (unique), `external_id` (unique, nullable), `description`, `content`, `logo_url` | `external_id` = Nhanh.vn ID (source of truth for sync idempotency) |
| `seo` | `SeoMetadata` | `id`, `meta_title`, `meta_description`, `meta_keywords`, `og_*`, `canonical_url` | Generic; attached via links to product/category/collection/brand |
| `entity-content` | `EntityContent` | `id`, `content` (HTML from Tiptap) | Generic rich-content blob; attached via links |
| `email-template` | `EmailTemplate` | `id`, `template_key` (unique), `name`, `subject`, `body` (Handlebars), `is_enabled`, `category`, `available_variables` | Admin-managed transactional email templates |
| `product-review` | `Review` | `id`, `product_id`, `customer_id` (nullable for guest), `rating`, `title`, `content`, `first_name`, `last_name`, `status` (pending/approved/rejected), `images` (JSON) | Moderation flow: created as `pending`, admin approves → visible on storefront |
| `wishlist` | `WishlistItem` | `id`, `customer_id`, `product_id` | Unique index `(customer_id, product_id)` — prevents duplicates |

### 7.3 Module links (see `src/links/`)

| Link | Cardinality | Purpose |
|------|-------------|---------|
| `Product ↔ Brand` | Product **belongs to many** Brands (list) | Via `src/links/product-brand.ts` |
| `Product ↔ SeoMetadata` | 1:1 | SEO override per product |
| `ProductCategory ↔ SeoMetadata` | 1:1 | SEO per category |
| `ProductCollection ↔ SeoMetadata` | 1:1 | SEO per collection |
| `Brand ↔ SeoMetadata` | 1:1 | SEO per brand |
| `Product ↔ EntityContent` | 1:1 | Rich HTML content per product |
| `ProductCategory ↔ EntityContent` | 1:1 | Rich content per category |
| `ProductCollection ↔ EntityContent` | 1:1 | Rich content per collection |
| `Product ↔ Review` | 1:N | All reviews for a product |

### 7.4 Key invariants

- **Review visibility:** Only `status === "approved"` reviews are exposed on `/store/*` endpoints.
- **Wishlist uniqueness:** `(customer_id, product_id)` must be unique (enforced by DB index).
- **Brand sync identity:** When pulling from Nhanh.vn, match by `external_id`, not by `name` or `handle`.
- **SEO fallback:** If `SeoMetadata` is missing/empty for an entity, storefront should fall back to entity's own `title`/`description`.
- **Payment provider identity:** Payment providers registered by `id` in `medusa-config.ts` — `cod` and `bank-transfer`. Region `payment_providers` must always include both in the Region detail response.
- **Currency:** VND only. No multi-currency logic needed.

---

## 8. Code Style

- TypeScript strict mode; no `any` unless justified.
- **Admin UI text: English only.** Storefront-facing text (emails, customer-visible): Vietnamese OK.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Request validation: Zod in `validators.ts`, registered in `src/api/middlewares.ts`.
- Always call a **workflow** from API routes — never service directly.
- Subscribers for side effects (emails, search index sync), not core business logic.
- Comments: WHY, not WHAT. Skip obvious comments.
- Secrets via `process.env`. Never commit `.env`.

---

## 9. Testing Strategy

**Levels:**
1. **Unit tests** — pure functions/utilities
2. **Module integration** (`integration-tests/modules/`) — service against real DB
3. **HTTP integration** (`integration-tests/http/`) — full API request lifecycle

**When to write:**
- New custom module service with non-trivial logic → module integration
- New API route → HTTP integration (happy path + auth failure)
- Bug fix → regression test first (Prove-It: fail before fix, pass after)

**CI gate:** `test:unit` + `test:integration:http` must pass.
**Not required:** 100% coverage. Test what can break.

---

## 10. Boundaries

### Always do
- Use workflows for all writes
- Validate requests with Zod
- Update `STOREFRONT_INTEGRATION.md` when adding/changing `/store/*` endpoint
- Keep admin UI English, storefront content Vietnamese
- Run `db:generate` after model change, commit the migration
- Integration test for new API routes

### Ask first
- Adding a top-level module to `medusa-config.ts`
- Schema change on existing modules (migration compatibility)
- Payment provider behavior change (risk mis-capturing money)
- Nhanh.vn sync logic change (risk duplicated orders / lost products)
- Dependency major-version upgrade

### Never do
- **Build CMS features** (blog, pages, banners, marketing copy) — Strapi's job
- **Build a storefront** in this repo
- **Build online payment gateways** (VNPay/Momo/Stripe) — only COD + bank transfer for now
- **Send SMS** — email only
- **Expose admin API publicly** — admin auth required at app layer
- **Connect Medusa directly to Strapi** — cross-system stitching is storefront's job
- **Call services directly from API routes** — use workflows
- Commit `.env` / credentials
- Add Vietnamese text to admin UI
- Edit DB directly, skipping migrations

---

## 11. Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| Performance | Store API p95 < 500ms for product listing |
| SEO | Product & category endpoints return SEO fields ready for meta tags |
| Security | Admin API: admin auth. Store API: publishable key. Customer endpoints: customer session. |
| Observability | Medusa logger; APM/Sentry optional |
| Backups | Handled at VPS/Coolify level |
| Locale | Currency: VND only. Timezone: Asia/Ho_Chi_Minh |

---

## 12. Future Scope (not yet in progress)

- Online payment gateways: VNPay, Momo.
- Loyalty program, subscriptions — postponed (per Q2 2026 feature plan).
- Nhanh.vn order status sync (Nhanh → Medusa) — currently push-only one-way.

---

## 13. Open Questions

- [ ] SLA / uptime target? (hiện assume best-effort)
- [ ] Multi-tenant trong tương lai? (nếu có, data model cần chuẩn bị từ giờ)
- [ ] Coolify build timeout: cân nhắc build local → push GHCR/Docker Hub để né phí GitHub Actions.
