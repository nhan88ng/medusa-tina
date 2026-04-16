# Medusa Tina

Headless e-commerce backend cho **TINA SHOP** — cửa hàng túi xách thời trang Việt Nam. Built on [Medusa v2](https://medusajs.com).

## Kiến trúc tổng thể

```
┌──────────────┐       ┌────────────────┐       ┌────────────┐
│ Storefront   │──────>│  Medusa Tina   │<─────>│ Nhanh.vn   │
│ (Next.js)    │       │  (this repo)   │       │ POS        │
└──────────────┘       └────────────────┘       └────────────┘
       │
       └────────────────────> Strapi CMS (blog, pages)
```

Repo này phụ trách: products, orders, customers, payment, admin dashboard, và 2-way sync với Nhanh.vn POS.

**Không** phụ trách: blog/marketing content (Strapi), storefront UI (repo riêng), online payment gateway.

## Yêu cầu

- Node.js ≥ 20
- PostgreSQL
- Redis (optional trong dev, bắt buộc trong production)
- MeiliSearch (cho tìm kiếm sản phẩm)

## Quick Start

```bash
# Cài đặt
npm install
cp .env.template .env   # điền các env vars

# Database
npx medusa db:migrate
npm run seed            # seed regions + currencies (VND)
npm run seed:vn         # seed catalog túi xách

# Tạo admin user
npx medusa user -e admin@example.com -p <password>

# Dev
npm run dev             # backend: http://localhost:9000, admin: http://localhost:5173
```

## Lệnh thường dùng

```bash
# Database
npx medusa db:migrate
npx medusa db:generate <ModuleName>

# Test
npm run test:unit
npm run test:integration:http
npm run test:integration:modules

# Build production
npm run build
npm start
```

## Custom modules

| Module | Mục đích |
|--------|----------|
| `brand` | Thương hiệu sản phẩm |
| `seo` | SEO metadata (title, description, OG) cho product/category/collection/brand |
| `entity-content` | Nội dung HTML giàu (Tiptap) |
| `email-template` | Email templates (Handlebars) quản lý từ admin |
| `product-review` | Review + rating với moderation |
| `wishlist` | Wishlist của customer |
| `meilisearch` | Full-text search tiếng Việt |
| `payment-cod` | Thanh toán khi nhận hàng |
| `payment-bank-transfer` | Chuyển khoản thủ công, admin xác nhận |
| `email-notification` | Gmail OAuth2 provider |

## Tích hợp Nhanh.vn

- **Product pull:** admin → `/admin/nhanh-sync` → kéo categories/brands/products về Medusa
- **Order push:** khi `order.placed` → subscriber tự push sang Nhanh qua `/v3.0/order/add`
- **Retry & override:** `POST /admin/orders/:id/nhanh-push` (admin UI widget)

Chi tiết: xem section "Nhanh.vn Integration" trong [CLAUDE.md](CLAUDE.md).

## Deployment

- Docker image build qua GitHub Actions → deploy Coolify trên VPS
- File storage: Cloudflare R2 (S3-compatible) qua `S3_*` env vars
- SSL database mặc định bật (set `DATABASE_SSL=false` để tắt)

## Tài liệu

| File | Nội dung |
|------|----------|
| [SPEC.md](SPEC.md) | Source of truth cho scope, domain model, boundaries |
| [CLAUDE.md](CLAUDE.md) | Hướng dẫn cho AI agents (architecture overview) |
| [STOREFRONT_INTEGRATION.md](STOREFRONT_INTEGRATION.md) | Store API reference cho storefront team |
| [tasks/](tasks/) | Implementation plans (reference) |

## License

Private — TINA SHOP.
