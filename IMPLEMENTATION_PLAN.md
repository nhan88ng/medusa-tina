# Implementation Plan - Medusa Tina Features

> Kế hoạch triển khai 5 tính năng mới cho Medusa Tina Shop
> Ngày tạo: 2026-04-04
> Thứ tự triển khai theo priority

---

## Tổng quan

| # | Feature | Priority | Complexity | New Files | Depends On |
|---|---------|----------|-----------|-----------|------------|
| 1 | Payment (COD + Bank Transfer) | Critical | Medium | ~8 | - |
| 2 | File Storage (Local VPS) | Critical | Low | ~0 | - |
| 3 | Product Reviews & Ratings | High | High | ~20 | File Storage |
| 4 | Wishlist | High | Medium | ~12 | - |
| 5 | MeiliSearch | Medium | Medium | ~10 | - |

---

## Feature 1: Payment Methods (COD + Bank Transfer)

### 1.1 COD (Cash on Delivery) Payment Provider

**Mô tả:** Khách thanh toán tiền mặt khi nhận hàng. Không cần xử lý online.

#### Module Structure

```
src/modules/payment-cod/
├── index.ts          # ModuleProvider registration
└── service.ts        # CodPaymentService extends AbstractPaymentProvider
```

#### `src/modules/payment-cod/service.ts`

```typescript
import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import { PaymentProviderError, PaymentActions } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { generateId } from "@medusajs/framework/utils"

class CodPaymentService extends AbstractPaymentProvider {
  static identifier = "cod"

  // initiatePayment: return session with method info
  // authorizePayment: auto-authorize (status: "authorized")
  // capturePayment: capture when delivery confirmed
  // cancelPayment: allow cancel
  // refundPayment: allow refund
  // deletePayment, retrievePayment, updatePayment, getPaymentStatus: simple stubs
  // getWebhookActionAndData: return { action: PaymentActions.NOT_SUPPORTED }
}
```

**Key behavior:**
- `initiatePayment` → returns `{ status: "pending", data: { method: "cod" } }`
- `authorizePayment` → returns `{ status: "authorized" }` (auto-authorize vì khách trả khi nhận)
- `capturePayment` → returns `{ data: { captured: true } }` (admin bấm khi đã giao + nhận tiền)
- Không cần webhook

#### `src/modules/payment-cod/index.ts`

```typescript
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CodPaymentService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [CodPaymentService],
})
```

---

### 1.2 Bank Transfer Payment Provider

**Mô tả:** Sau khi đặt hàng, gửi email chứa thông tin tài khoản ngân hàng cho khách. Admin xác nhận thủ công khi nhận được tiền.

#### Module Structure

```
src/modules/payment-bank-transfer/
├── index.ts          # ModuleProvider registration
└── service.ts        # BankTransferPaymentService
```

#### `src/modules/payment-bank-transfer/service.ts`

```typescript
import { AbstractPaymentProvider } from "@medusajs/framework/utils"

type BankTransferOptions = {
  bank_name: string
  account_number: string
  account_holder: string
  bank_branch?: string
}

class BankTransferPaymentService extends AbstractPaymentProvider {
  static identifier = "bank-transfer"

  protected options_: BankTransferOptions

  constructor({ logger }, options: BankTransferOptions) {
    super()
    this.options_ = options
  }

  // initiatePayment: return session with bank info for storefront to display
  //   data: { method: "bank-transfer", bank_name, account_number, account_holder, bank_branch }
  // authorizePayment: return { status: "pending" } (chờ admin xác nhận)
  // capturePayment: admin confirms receipt → capture
  // cancelPayment, refundPayment: allow
  // getWebhookActionAndData: NOT_SUPPORTED (thủ công)
}
```

**Key behavior:**
- `initiatePayment` → trả về thông tin ngân hàng trong `data` để storefront hiển thị
- `authorizePayment` → trả `status: "pending"` (QUAN TRỌNG: pending = chờ admin xác nhận)
- `capturePayment` → admin bấm "Xác nhận đã nhận tiền" trên dashboard

#### `src/modules/payment-bank-transfer/index.ts`

```typescript
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import BankTransferPaymentService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [BankTransferPaymentService],
})
```

---

### 1.3 Email Template: Thông tin chuyển khoản

Thêm template mới vào `src/modules/email-template/default-templates.ts`:

```typescript
{
  template_key: "bank-transfer-info",
  name: "Thông tin chuyển khoản",
  description: "Gửi sau khi khách chọn phương thức chuyển khoản",
  category: "transaction",
  is_enabled: true,
  subject: "Thông tin chuyển khoản - Đơn hàng #{{order_id}} - Tina Shop",
  body: emailWrapper(`
    <h2>Xin chào {{customer_name}},</h2>
    <p>Cảm ơn bạn đã đặt hàng tại Tina Shop! Vui lòng chuyển khoản theo thông tin bên dưới:</p>
    <table style="...">
      <tr><td>Ngân hàng:</td><td><strong>{{bank_name}}</strong></td></tr>
      <tr><td>Số tài khoản:</td><td><strong>{{account_number}}</strong></td></tr>
      <tr><td>Chủ tài khoản:</td><td><strong>{{account_holder}}</strong></td></tr>
      <tr><td>Chi nhánh:</td><td>{{bank_branch}}</td></tr>
      <tr><td>Số tiền:</td><td><strong>{{formatPrice total currency_code}}</strong></td></tr>
      <tr><td>Nội dung CK:</td><td><strong>TINA {{order_id}}</strong></td></tr>
    </table>
    <p>⏰ Vui lòng chuyển khoản trong vòng 24 giờ. Đơn hàng sẽ được xử lý sau khi chúng tôi nhận được thanh toán.</p>
  `),
  available_variables: JSON.stringify(["order_id", "customer_name", "total", "currency_code", "bank_name", "account_number", "account_holder", "bank_branch"]),
}
```

---

### 1.4 Subscriber: Gửi email thông tin chuyển khoản

**File:** `src/subscribers/bank-transfer-info.ts`

```typescript
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

export default async function sendBankTransferInfo({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")

  // 1. Fetch order with payment_collections
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "email", "total", "currency_code",
      "customer.first_name", "customer.last_name",
      "payment_collections.payment_sessions.*",
    ],
    filters: { id: data.id },
  })

  const order = orders?.[0]
  if (!order?.email) return

  // 2. Check if payment method is bank-transfer
  const isBankTransfer = order.payment_collections?.some(pc =>
    pc.payment_sessions?.some(ps => ps.provider_id === "pp_bank-transfer_bank-transfer")
  )
  if (!isBankTransfer) return

  // 3. Send bank transfer info email
  await sendTemplatedEmail(container, "bank-transfer-info", order.email, {
    order_id: order.display_id,
    customer_name: [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" "),
    total: order.total,
    currency_code: order.currency_code,
    bank_name: process.env.BANK_NAME || "Vietcombank",
    account_number: process.env.BANK_ACCOUNT_NUMBER || "",
    account_holder: process.env.BANK_ACCOUNT_HOLDER || "TINA SHOP",
    bank_branch: process.env.BANK_BRANCH || "",
  })
}

export const config: SubscriberConfig = { event: "order.placed" }
```

---

### 1.5 Admin Widget: Xác nhận chuyển khoản

**File:** `src/admin/widgets/order-bank-transfer.tsx`

Widget tại zone `order.details.after`:
- Kiểm tra đơn hàng có dùng bank-transfer không
- Hiển thị trạng thái: "Chờ xác nhận chuyển khoản"
- Nút "Xác nhận đã nhận tiền" → gọi `POST /admin/orders/:id/capture`
- Sau khi capture thành công → hiển thị "Đã xác nhận thanh toán"

---

### 1.6 Configuration

**`medusa-config.ts`** - thêm vào modules array:

```typescript
{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [
      {
        resolve: "./src/modules/payment-cod",
        id: "cod",
        options: {},
      },
      {
        resolve: "./src/modules/payment-bank-transfer",
        id: "bank-transfer",
        options: {
          bank_name: process.env.BANK_NAME || "Vietcombank",
          account_number: process.env.BANK_ACCOUNT_NUMBER || "",
          account_holder: process.env.BANK_ACCOUNT_HOLDER || "TINA SHOP",
          bank_branch: process.env.BANK_BRANCH || "",
        },
      },
    ],
  },
},
```

**`.env`** - thêm:

```env
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_HOLDER=TINA SHOP
BANK_BRANCH=
```

**Seed data** - cập nhật `src/scripts/seed-vn-handbags.ts`:

```typescript
payment_providers: ["pp_cod_cod", "pp_bank-transfer_bank-transfer"],
```

---

## Feature 2: File Storage (Local VPS)

### Mô tả

Sử dụng `@medusajs/medusa/file-local` có sẵn trong Medusa. File được lưu trên filesystem của VPS.

### Configuration

**`medusa-config.ts`** - thêm vào modules:

```typescript
{
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [
      {
        resolve: "@medusajs/medusa/file-local",
        id: "local",
        options: {
          upload_dir: process.env.FILE_UPLOAD_DIR || "static",
          backend_url: process.env.FILE_BACKEND_URL || "http://localhost:9000",
        },
      },
    ],
  },
},
```

**`.env`** - thêm:

```env
FILE_UPLOAD_DIR=static
FILE_BACKEND_URL=http://localhost:9000
```

**Production:** `FILE_BACKEND_URL=https://api.tinashop.vn` (URL public của Medusa backend)

### Không cần code mới

Medusa admin dashboard đã hỗ trợ upload ảnh sản phẩm, category, etc. Module `Modules.FILE` tự động available trong container.

### Lưu ý VPS

- Thư mục `static/` cần được persist khi deploy (không bị xóa khi redeploy)
- Trên Coolify: mount volume cho thư mục `static/`
- Backup: nên setup cron backup thư mục `static/` định kỳ

---

## Feature 3: Product Reviews & Ratings

### 3.1 Module Structure

```
src/modules/product-review/
├── index.ts
├── service.ts
├── models/
│   └── review.ts
└── migrations/
    └── Migration20260404000000.ts    # auto-generated
```

### 3.2 Data Model

**File:** `src/modules/product-review/models/review.ts`

```typescript
import { model } from "@medusajs/framework/utils"

const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text().nullable(),
  rating: model.number(),           // 1-5
  title: model.text().nullable(),
  content: model.text(),
  first_name: model.text(),
  last_name: model.text(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  images: model.json().nullable(),  // array of image URLs
})

export default Review
```

### 3.3 Service

**File:** `src/modules/product-review/service.ts`

```typescript
import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"

class ProductReviewModuleService extends MedusaService({ Review }) {
  // Custom method: getAverageRating(productId) using raw SQL
  // Returns { average: number, count: number }
}

export default ProductReviewModuleService
```

Custom method `getAverageRating`:
- Sử dụng `@InjectManager()` + `@MedusaContext()` pattern
- Raw SQL: `SELECT AVG(rating) as avg, COUNT(*) as count FROM review WHERE product_id = ? AND status = 'approved' AND deleted_at IS NULL`
- Return `{ average: parseFloat(avg) || 0, count: parseInt(count) }`

### 3.4 Module Export

**File:** `src/modules/product-review/index.ts`

```typescript
import ProductReviewModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_REVIEW_MODULE = "productReview"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewModuleService,
})
```

### 3.5 Link

**File:** `src/links/product-review.ts`

```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductReviewModule from "../modules/product-review"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: ProductReviewModule.linkable.review,
    isList: true,
    deleteCascade: true,
  }
)
```

### 3.6 Workflows

```
src/workflows/
├── create-review.ts
├── update-review.ts
├── delete-review.ts
└── steps/
    ├── create-review.ts
    ├── update-review.ts
    └── delete-review.ts
```

**create-review workflow:**
1. `createReviewStep` - tạo review với status "pending"
2. `createRemoteLinkStep` - link review → product

**update-review workflow:**
1. `updateReviewStep` - update status (approve/reject) hoặc content

**delete-review workflow:**
1. `dismissRemoteLinkStep` - unlink
2. `deleteReviewStep` - soft delete

### 3.7 API Routes

#### Admin Routes

```
src/api/admin/reviews/
├── route.ts              # GET: list reviews (filter by status, product_id)
├── [id]/
│   └── route.ts          # GET: detail, POST: update (approve/reject), DELETE
└── validators.ts         # Zod schemas
```

**GET /admin/reviews** - query params: `status`, `product_id`, `limit`, `offset`, `order`
**GET /admin/reviews/:id** - chi tiết review
**POST /admin/reviews/:id** - update status: `{ status: "approved" | "rejected" }`
**DELETE /admin/reviews/:id** - xóa review

**Validators:**

```typescript
import { z } from "zod"

export const UpdateReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
})
```

#### Store Routes

```
src/api/store/products/[id]/reviews/
└── route.ts              # GET: list approved reviews, POST: submit review
```

**GET /store/products/:id/reviews**
- Chỉ trả về reviews có status "approved"
- Bao gồm average rating + count
- Pagination: `limit`, `offset`
- Response: `{ reviews: [...], average_rating: 4.5, total_count: 25 }`

**POST /store/products/:id/reviews**
- Requires authenticated customer (`req.auth_context.actor_id`)
- Body: `{ rating: 1-5, title?, content, first_name, last_name, images?: string[] }`
- Auto-set `product_id` từ URL param, `customer_id` từ auth
- Status mặc định: "pending"

**Validators:**

```typescript
export const CreateReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  images: z.array(z.string().url()).optional(),
})
```

### 3.8 Middleware Registration

Thêm vào `src/api/middlewares.ts`:

```typescript
import { CreateReviewSchema, UpdateReviewSchema } from "./admin/reviews/validators"
import { CreateStoreReviewSchema } from "./store/products/[id]/reviews/validators"

// Admin
{ matcher: "/admin/reviews/:id", method: "POST", middlewares: [validateAndTransformBody(UpdateReviewSchema)] },

// Store
{ matcher: "/store/products/:id/reviews", method: "POST", middlewares: [validateAndTransformBody(CreateStoreReviewSchema)] },
```

### 3.9 Admin UI

#### Review Management Page

**File:** `src/admin/routes/reviews/page.tsx`

```
defineRouteConfig({ label: "Reviews", icon: StarSolid })
```

Features:
- Bảng danh sách reviews: Product name, Customer, Rating (sao), Status (badge), Date
- Filter dropdown: All / Pending / Approved / Rejected
- Click vào row → mở drawer chi tiết
- Nút Approve / Reject trong drawer
- Badge màu: pending=yellow, approved=green, rejected=red
- Hiển thị ảnh review (nếu có)

#### Product Reviews Widget

**File:** `src/admin/widgets/product-reviews.tsx`

```
defineWidgetConfig({ zone: "product.details.after" })
```

Features:
- Hiển thị: ⭐ 4.5/5 (25 đánh giá)
- Danh sách 5 review gần nhất
- Link "Xem tất cả" → navigate to `/reviews?product_id=xxx`

### 3.10 Email Template

Thêm vào `default-templates.ts`:

```typescript
{
  template_key: "review-submitted",
  name: "Xác nhận đã gửi đánh giá",
  description: "Cảm ơn khách hàng đã gửi đánh giá sản phẩm",
  category: "care",
  subject: "Cảm ơn bạn đã đánh giá - Tina Shop",
  body: emailWrapper(`...thank you for your review...pending approval...`),
  // ...
}
```

### 3.11 Cập nhật Review Request Job

Cập nhật `src/jobs/review-request.ts`:
- Thêm check: nếu khách đã review sản phẩm → không gửi email nhắc nữa
- Query review module trước khi gửi email

### 3.12 Configuration

**`medusa-config.ts`:**

```typescript
{ resolve: "./src/modules/product-review" },
```

**Migration:**

```bash
npx medusa db:generate productReview
npx medusa db:migrate
```

---

## Feature 4: Wishlist

### 4.1 Module Structure

```
src/modules/wishlist/
├── index.ts
├── service.ts
├── models/
│   └── wishlist-item.ts
└── migrations/
    └── Migration20260404000001.ts    # auto-generated
```

### 4.2 Data Model

**File:** `src/modules/wishlist/models/wishlist-item.ts`

```typescript
import { model } from "@medusajs/framework/utils"

const WishlistItem = model.define("wishlist_item", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
}).indexes([
  {
    on: ["customer_id", "product_id"],
    unique: true,
    name: "IDX_WISHLIST_CUSTOMER_PRODUCT",
  },
])

export default WishlistItem
```

### 4.3 Service

**File:** `src/modules/wishlist/service.ts`

```typescript
import { MedusaService } from "@medusajs/framework/utils"
import WishlistItem from "./models/wishlist-item"

class WishlistModuleService extends MedusaService({ WishlistItem }) {
  // Custom method: toggleItem(customerId, productId) → { added: boolean }
  // Custom method: isInWishlist(customerId, productId) → boolean
  // Custom method: getWishlistCount(productId) → number
}

export default WishlistModuleService
```

### 4.4 Module Export

**File:** `src/modules/wishlist/index.ts`

```typescript
import WishlistModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const WISHLIST_MODULE = "wishlist"

export default Module(WISHLIST_MODULE, {
  service: WishlistModuleService,
})
```

### 4.5 Workflows

```
src/workflows/
├── add-to-wishlist.ts
├── remove-from-wishlist.ts
└── steps/
    ├── add-to-wishlist.ts
    └── remove-from-wishlist.ts
```

### 4.6 API Routes (Store Only)

```
src/api/store/customers/me/wishlist/
├── route.ts                  # GET: list, POST: add
└── [product_id]/
    └── route.ts              # DELETE: remove
```

**GET /store/customers/me/wishlist**
- Requires authenticated customer
- Returns wishlist items WITH product details (via query.graph)
- Response: `{ wishlist_items: [{ id, product_id, product: { id, title, handle, thumbnail, variants... } }] }`

**POST /store/customers/me/wishlist**
- Body: `{ product_id: string }`
- Toggle behavior: nếu đã có → remove, nếu chưa có → add
- Response: `{ wishlist_item: {...}, added: true/false }`

**DELETE /store/customers/me/wishlist/:product_id**
- Remove sản phẩm khỏi wishlist
- Response: `{ id, deleted: true }`

**Validators:**

```typescript
export const AddToWishlistSchema = z.object({
  product_id: z.string().min(1),
})
```

### 4.7 Middleware

Thêm vào `src/api/middlewares.ts`:

```typescript
{ matcher: "/store/customers/me/wishlist", method: "POST", middlewares: [validateAndTransformBody(AddToWishlistSchema)] },
```

### 4.8 Admin Widget (Optional)

**File:** `src/admin/widgets/product-wishlist-count.tsx`

Widget tại `product.details.after`:
- Hiển thị: "❤️ X khách hàng đã thêm vào yêu thích"
- Chỉ đếm, không cho edit

### 4.9 Configuration

**`medusa-config.ts`:**

```typescript
{ resolve: "./src/modules/wishlist" },
```

**Migration:**

```bash
npx medusa db:generate wishlist
npx medusa db:migrate
```

---

## Feature 5: MeiliSearch Integration

### 5.1 Module Structure

```
src/modules/meilisearch/
├── index.ts
└── service.ts
```

> **Lưu ý:** Đây KHÔNG phải custom Medusa module (không dùng MedusaService).
> Đây là custom service module dùng để wrap MeiliSearch client.

### 5.2 Service

**File:** `src/modules/meilisearch/service.ts`

```typescript
import { MeiliSearch } from "meilisearch"

type MeilisearchOptions = {
  host: string
  apiKey: string
  productIndexName?: string
}

class MeilisearchModuleService {
  protected client_: MeiliSearch
  protected productIndex_: string

  constructor(_, options: MeilisearchOptions) {
    this.client_ = new MeiliSearch({
      host: options.host,
      apiKey: options.apiKey,
    })
    this.productIndex_ = options.productIndexName || "products"
  }

  // indexProducts(products[]) → add/update documents
  // deleteProducts(productIds[]) → remove documents
  // searchProducts(query, filters?, sort?) → search results
  // configureProductIndex() → set searchable/filterable/sortable attributes
  // getStats() → index statistics
}
```

**Index configuration cho products:**

```typescript
searchableAttributes: ["title", "description", "handle", "brand_name", "category_names", "collection_title"]
filterableAttributes: ["status", "category_ids", "collection_id", "brand_id", "price_range"]
sortableAttributes: ["created_at", "title", "min_price"]
```

### 5.3 Module Export

**File:** `src/modules/meilisearch/index.ts`

```typescript
import MeilisearchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MEILISEARCH_MODULE = "meilisearch"

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
})
```

### 5.4 Subscribers (Event-driven Sync)

**File:** `src/subscribers/meilisearch-product-upsert.ts`

```typescript
// Listens to: product.created, product.updated
// Fetches product with all related data (brand, categories, collection, prices)
// Transforms to search document
// Calls meilisearchService.indexProducts([document])
```

**File:** `src/subscribers/meilisearch-product-delete.ts`

```typescript
// Listens to: product.deleted
// Calls meilisearchService.deleteProducts([data.id])
```

**Document structure cho MeiliSearch:**

```typescript
{
  id: "prod_xxx",
  title: "Túi xách ABC",
  description: "...",
  handle: "tui-xach-abc",
  thumbnail: "https://...",
  status: "published",
  brand_id: "brand_xxx",
  brand_name: "Gucci",
  category_ids: ["cat_xxx"],
  category_names: ["Túi xách tay"],
  collection_id: "col_xxx",
  collection_title: "Bộ sưu tập mùa hè",
  min_price: 500000,        // VND - giá thấp nhất từ variants
  max_price: 1200000,       // VND
  created_at: 1712188800,   // timestamp for sorting
  // Khi có reviews: average_rating, review_count
}
```

### 5.5 API Routes

**File:** `src/api/store/search/route.ts`

```typescript
// GET /store/search?q=túi+xách&category_id=cat_xxx&sort=min_price:asc&limit=20&offset=0
// Calls meilisearchService.searchProducts(q, filters, sort, pagination)
// Returns: { hits: [...], total: 100, limit: 20, offset: 0 }
```

**File:** `src/api/admin/meilisearch/sync/route.ts`

```typescript
// POST /admin/meilisearch/sync
// Full reindex: fetch ALL published products, index them
// Returns: { success: true, indexed_count: 500 }
```

### 5.6 Job: Initial Index Setup

**File:** `src/jobs/meilisearch-setup.ts`

```typescript
// Schedule: numberOfExecutions: 1 (run once on startup)
// 1. Configure index (searchable/filterable/sortable attributes)
// 2. Full sync of all published products
```

### 5.7 Admin UI

**File:** `src/admin/routes/search/page.tsx` (hoặc widget)

Simple page/widget:
- Hiển thị: Index stats (tổng documents, last update)
- Nút "Reindex tất cả" → POST /admin/meilisearch/sync
- Loading indicator khi đang sync

### 5.8 Configuration

**`medusa-config.ts`:**

```typescript
{
  resolve: "./src/modules/meilisearch",
  options: {
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "",
    productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX || "products",
  },
},
```

**`.env`:**

```env
MEILISEARCH_HOST=http://your-coolify-meilisearch:7700
MEILISEARCH_API_KEY=your-master-key
MEILISEARCH_PRODUCT_INDEX=products
```

**`package.json`** - thêm dependency:

```bash
npm install meilisearch
```

---

## Tổng hợp: Thay đổi cần thiết cho `medusa-config.ts`

```typescript
modules: [
  // === EXISTING ===
  { resolve: "./src/modules/brand" },
  { resolve: "./src/modules/seo" },
  { resolve: "./src/modules/entity-content" },
  { resolve: "./src/modules/email-template" },
  {
    resolve: "@medusajs/medusa/notification",
    options: { providers: [/* gmail config */] },
  },

  // === NEW: Feature 1 - Payment ===
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        { resolve: "./src/modules/payment-cod", id: "cod", options: {} },
        {
          resolve: "./src/modules/payment-bank-transfer",
          id: "bank-transfer",
          options: {
            bank_name: process.env.BANK_NAME || "Vietcombank",
            account_number: process.env.BANK_ACCOUNT_NUMBER || "",
            account_holder: process.env.BANK_ACCOUNT_HOLDER || "TINA SHOP",
            bank_branch: process.env.BANK_BRANCH || "",
          },
        },
      ],
    },
  },

  // === NEW: Feature 2 - File Storage ===
  {
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/file-local",
          id: "local",
          options: {
            upload_dir: process.env.FILE_UPLOAD_DIR || "static",
            backend_url: process.env.FILE_BACKEND_URL || "http://localhost:9000",
          },
        },
      ],
    },
  },

  // === NEW: Feature 3 - Reviews ===
  { resolve: "./src/modules/product-review" },

  // === NEW: Feature 4 - Wishlist ===
  { resolve: "./src/modules/wishlist" },

  // === NEW: Feature 5 - MeiliSearch ===
  {
    resolve: "./src/modules/meilisearch",
    options: {
      host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || "",
      productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX || "products",
    },
  },

  // Redis modules (conditional)
  ...redisModules,
],
```

---

## Tổng hợp: Environment Variables mới

```env
# Feature 1: Payment - Bank Transfer
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_HOLDER=TINA SHOP
BANK_BRANCH=

# Feature 2: File Storage
FILE_UPLOAD_DIR=static
FILE_BACKEND_URL=http://localhost:9000

# Feature 5: MeiliSearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=
MEILISEARCH_PRODUCT_INDEX=products
```

---

## Tổng hợp: Tất cả file mới

### Feature 1: Payment (~8 files)

| File | Mô tả |
|------|-------|
| `src/modules/payment-cod/service.ts` | COD payment provider service |
| `src/modules/payment-cod/index.ts` | Module provider registration |
| `src/modules/payment-bank-transfer/service.ts` | Bank transfer payment provider |
| `src/modules/payment-bank-transfer/index.ts` | Module provider registration |
| `src/subscribers/bank-transfer-info.ts` | Send bank info email on order placed |
| `src/admin/widgets/order-bank-transfer.tsx` | Admin widget to confirm payment |
| **Update:** `medusa-config.ts` | Add payment providers |
| **Update:** `default-templates.ts` | Add bank-transfer-info template |
| **Update:** `seed-vn-handbags.ts` | Update payment_providers in region |

### Feature 2: File Storage (~0 new files)

| File | Mô tả |
|------|-------|
| **Update:** `medusa-config.ts` | Add file-local provider |
| **Update:** `.env` / `.env.template` | Add FILE_* vars |

### Feature 3: Reviews (~18 files)

| File | Mô tả |
|------|-------|
| `src/modules/product-review/models/review.ts` | Review data model |
| `src/modules/product-review/service.ts` | Service with getAverageRating |
| `src/modules/product-review/index.ts` | Module export |
| `src/modules/product-review/migrations/` | Auto-generated |
| `src/links/product-review.ts` | Product ↔ Reviews link |
| `src/workflows/create-review.ts` | Create review workflow |
| `src/workflows/update-review.ts` | Update review workflow |
| `src/workflows/delete-review.ts` | Delete review workflow |
| `src/workflows/steps/create-review.ts` | Create step |
| `src/workflows/steps/update-review.ts` | Update step |
| `src/workflows/steps/delete-review.ts` | Delete step |
| `src/api/admin/reviews/route.ts` | Admin list reviews |
| `src/api/admin/reviews/[id]/route.ts` | Admin CRUD review |
| `src/api/admin/reviews/validators.ts` | Zod schemas |
| `src/api/store/products/[id]/reviews/route.ts` | Store list + submit reviews |
| `src/api/store/products/[id]/reviews/validators.ts` | Zod schemas |
| `src/admin/routes/reviews/page.tsx` | Reviews management page |
| `src/admin/widgets/product-reviews.tsx` | Product detail widget |
| **Update:** `src/api/middlewares.ts` | Register validators |
| **Update:** `medusa-config.ts` | Add module |
| **Update:** `default-templates.ts` | Add review-submitted template |
| **Update:** `src/jobs/review-request.ts` | Check existing reviews |

### Feature 4: Wishlist (~10 files)

| File | Mô tả |
|------|-------|
| `src/modules/wishlist/models/wishlist-item.ts` | WishlistItem data model |
| `src/modules/wishlist/service.ts` | Service with toggle/check |
| `src/modules/wishlist/index.ts` | Module export |
| `src/modules/wishlist/migrations/` | Auto-generated |
| `src/workflows/add-to-wishlist.ts` | Add workflow |
| `src/workflows/remove-from-wishlist.ts` | Remove workflow |
| `src/workflows/steps/add-to-wishlist.ts` | Add step |
| `src/workflows/steps/remove-from-wishlist.ts` | Remove step |
| `src/api/store/customers/me/wishlist/route.ts` | List + add |
| `src/api/store/customers/me/wishlist/[product_id]/route.ts` | Remove |
| `src/api/store/customers/me/wishlist/validators.ts` | Zod schemas |
| `src/admin/widgets/product-wishlist-count.tsx` | Product wishlist count |
| **Update:** `src/api/middlewares.ts` | Register validators |
| **Update:** `medusa-config.ts` | Add module |

### Feature 5: MeiliSearch (~9 files)

| File | Mô tả |
|------|-------|
| `src/modules/meilisearch/service.ts` | MeiliSearch client wrapper |
| `src/modules/meilisearch/index.ts` | Module export |
| `src/subscribers/meilisearch-product-upsert.ts` | Sync on create/update |
| `src/subscribers/meilisearch-product-delete.ts` | Remove on delete |
| `src/jobs/meilisearch-setup.ts` | Initial index setup |
| `src/api/store/search/route.ts` | Public search API |
| `src/api/admin/meilisearch/sync/route.ts` | Admin full reindex |
| `src/admin/routes/search/page.tsx` | Admin search management |
| **Update:** `medusa-config.ts` | Add module |
| **Update:** `package.json` | Add meilisearch dependency |

---

## Thứ tự triển khai chi tiết

### Batch 1: Foundation (Feature 1 + 2) — Không dependencies

**Step 1.1:** File Storage config trong `medusa-config.ts` + env vars
**Step 1.2:** COD payment provider (module + config)
**Step 1.3:** Bank Transfer payment provider (module + config)
**Step 1.4:** Bank transfer email template + subscriber
**Step 1.5:** Admin widget xác nhận chuyển khoản
**Step 1.6:** Cập nhật seed data
**Step 1.7:** Test: `npx medusa db:migrate` → kiểm tra admin dashboard

### Batch 2: Reviews (Feature 3) — Cần File Storage cho ảnh review

**Step 2.1:** Review module (model + service + index)
**Step 2.2:** `npx medusa db:generate productReview` → migration
**Step 2.3:** Link product-review
**Step 2.4:** Workflows (create, update, delete)
**Step 2.5:** Admin API routes + validators
**Step 2.6:** Store API routes + validators
**Step 2.7:** Middleware registration
**Step 2.8:** Admin UI (reviews page + product widget)
**Step 2.9:** Email template review-submitted
**Step 2.10:** Cập nhật review-request job
**Step 2.11:** `npx medusa db:migrate` → test

### Batch 3: Wishlist (Feature 4) — Độc lập

**Step 3.1:** Wishlist module (model + service + index)
**Step 3.2:** `npx medusa db:generate wishlist` → migration
**Step 3.3:** Workflows (add, remove)
**Step 3.4:** Store API routes + validators
**Step 3.5:** Middleware registration
**Step 3.6:** Admin widget product-wishlist-count
**Step 3.7:** `npx medusa db:migrate` → test

### Batch 4: MeiliSearch (Feature 5) — Độc lập, nhưng tốt hơn nếu có reviews

**Step 4.1:** `npm install meilisearch`
**Step 4.2:** MeiliSearch module (service + index)
**Step 4.3:** Subscribers (product upsert + delete)
**Step 4.4:** Setup job (configure index + full sync)
**Step 4.5:** Store search API
**Step 4.6:** Admin sync API + UI
**Step 4.7:** Test: verify indexing + search

---

## Cập nhật STOREFRONT_INTEGRATION.md

Sau khi triển khai, cần cập nhật tài liệu storefront với các API mới:

### Store APIs mới:

| Endpoint | Method | Auth | Mô tả |
|----------|--------|------|-------|
| `/store/products/:id/reviews` | GET | No | Danh sách reviews + average rating |
| `/store/products/:id/reviews` | POST | Yes | Submit review mới |
| `/store/customers/me/wishlist` | GET | Yes | Danh sách wishlist |
| `/store/customers/me/wishlist` | POST | Yes | Add/toggle wishlist |
| `/store/customers/me/wishlist/:product_id` | DELETE | Yes | Remove from wishlist |
| `/store/search` | GET | No | Search products via MeiliSearch |

---

## Tính năng TẠM HOÃN

| Feature | Lý do | Khi nào xem lại |
|---------|-------|-----------------|
| Loyalty/Rewards | Cần nghiên cứu kỹ hơn về use case | Khi user quyết định |
| Subscriptions | Chưa phù hợp với sản phẩm túi xách | Khi có product fit |
| VNPay/VietQR | Chưa rõ thông tin tích hợp | Khi user có API credentials |
| Fulfillment integrations | Tạm dùng manual | Khi cần tích hợp vận chuyển |
| Analytics | Tích hợp sau | Sau khi launch |
tra