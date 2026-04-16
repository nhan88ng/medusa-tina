# Storefront Integration Guide — Custom Medusa Modules

This document describes all custom modules built on top of this Medusa backend and how to consume them from the storefront. Read this before implementing any feature that touches brands, SEO metadata, rich text content, or transactional/marketing emails.

---

## Overview of Custom Modules

| Module | Purpose |
|--------|---------|
| **Brand** | Brand entities linked to products |
| **SEO Metadata** | Per-entity SEO fields (title, description, OG tags, etc.) linked to products, categories, collections, and brands |
| **Entity Content** | Rich text (HTML) content linked to products, categories, and collections |
| **Email Template** | Admin-managed email templates (Handlebars HTML) with enable/disable per template |
| **Product Review** | Customer reviews with rating, moderation (pending/approved/rejected), and average rating |
| **Wishlist** | Customer wishlist with toggle behavior (add/remove per product) |
| **MeiliSearch** | Full-text product search with Vietnamese language support, filtering, and sorting |

All store endpoints are **public** (no auth required) and require the `x-publishable-api-key` header. Use the Medusa JS SDK — it handles this automatically.

---

## SDK Setup

Always use `sdk.client.fetch()` for these custom routes. Never use raw `fetch()`.

```typescript
// lib/medusa.ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
})
```

---

## Module: Brand

### Data shape

```typescript
type Brand = {
  id: string
  name: string
  handle: string          // URL-friendly slug, unique
  description: string | null
  content: string | null  // HTML rich text — brand long description
  logo_url: string | null
}
```

### Store API endpoints

#### List all brands

```
GET /store/brands
```

Response:
```json
{
  "brands": [
    {
      "id": "brand_01...",
      "name": "Nike",
      "handle": "nike",
      "description": "Short description",
      "content": "<p>Rich HTML content</p>",
      "logo_url": "https://..."
    }
  ]
}
```

#### Get SEO metadata for a brand

```
GET /store/brands/:id/seo
```

Response:
```json
{
  "seo_metadata": {
    "id": "seo_01...",
    "meta_title": "Nike — Official Store",
    "meta_description": "...",
    "meta_keywords": "nike, shoes, sportswear",
    "og_title": "Nike",
    "og_description": "...",
    "og_image": "https://...",
    "canonical_url": "https://...",
    "handle": "nike"
  }
}
```

`seo_metadata` is `null` if not set.

### Usage patterns

```typescript
// Fetch brand list (e.g. for brand directory page)
const { brands } = await sdk.client.fetch<{ brands: Brand[] }>("/store/brands")

// Fetch brand SEO (e.g. for generateMetadata in Next.js)
const { seo_metadata } = await sdk.client.fetch<{ seo_metadata: SeoMetadata | null }>(
  `/store/brands/${brandId}/seo`
)
```

---

## Module: SEO Metadata

Linked to: **products**, **product_categories**, **product_collections**, **brands**

### Data shape

```typescript
type SeoMetadata = {
  id: string
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null   // comma-separated keywords
  og_title: string | null
  og_description: string | null
  og_image: string | null        // absolute URL
  canonical_url: string | null
  handle: string | null
}
```

### Store API endpoints

| Entity | Endpoint |
|--------|----------|
| Product | `GET /store/products/:id/seo` |
| Category | `GET /store/categories/:id/seo` |
| Collection | `GET /store/collections/:id/seo` |
| Brand | `GET /store/brands/:id/seo` |

All return the same shape:
```json
{ "seo_metadata": { ...SeoMetadata } | null }
```

### Next.js `generateMetadata` pattern

Fetch SEO on the **server side** (not in a client hook) so Next.js can inject it into `<head>` for crawlers.

```typescript
// app/products/[handle]/page.tsx
import { sdk } from "@/lib/medusa"

export async function generateMetadata({ params }: { params: { handle: string } }) {
  // 1. resolve product id from handle
  const { products } = await sdk.store.product.list({ handle: params.handle })
  const product = products[0]
  if (!product) return {}

  // 2. fetch custom SEO
  const { seo_metadata } = await sdk.client.fetch<{ seo_metadata: SeoMetadata | null }>(
    `/store/products/${product.id}/seo`
  )

  return {
    title: seo_metadata?.meta_title ?? product.title,
    description: seo_metadata?.meta_description ?? product.description,
    keywords: seo_metadata?.meta_keywords ?? undefined,
    alternates: {
      canonical: seo_metadata?.canonical_url ?? undefined,
    },
    openGraph: {
      title: seo_metadata?.og_title ?? product.title,
      description: seo_metadata?.og_description ?? product.description,
      images: seo_metadata?.og_image ? [{ url: seo_metadata.og_image }] : [],
    },
  }
}
```

Apply the same pattern for category pages (`/store/categories/:id/seo`) and collection pages (`/store/collections/:id/seo`).

---

## Module: Entity Content

Linked to: **products**, **product_categories**, **product_collections**

Stores rich text HTML authored in the admin via a TipTap-based editor. The `content` field is an **HTML string**.

### Data shape

```typescript
type EntityContent = {
  id: string
  content: string | null  // HTML string
}
```

### Store API endpoints

| Entity | Endpoint |
|--------|----------|
| Product | `GET /store/products/:id/content` |
| Category | `GET /store/categories/:id/content` |
| Collection | `GET /store/collections/:id/content` |

All return:
```json
{ "entity_content": { "id": "...", "content": "<p>...</p>" } | null }
```

### Rendering rich text HTML

Use `dangerouslySetInnerHTML` with a `prose` wrapper (Tailwind Typography plugin recommended).

```tsx
// components/rich-content.tsx
type Props = { html: string | null | undefined }

export function RichContent({ html }: Props) {
  if (!html) return null
  return (
    <div
      className="prose prose-neutral max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

### React Query hooks

```typescript
// hooks/use-entity-content.ts
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/medusa"

type EntityContentResponse = {
  entity_content: { id: string; content: string | null } | null
}

export function useProductContent(productId: string | undefined) {
  return useQuery({
    queryKey: ["entity-content", "product", productId],
    queryFn: () =>
      sdk.client.fetch<EntityContentResponse>(`/store/products/${productId}/content`),
    enabled: !!productId,
  })
}

export function useCategoryContent(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["entity-content", "category", categoryId],
    queryFn: () =>
      sdk.client.fetch<EntityContentResponse>(`/store/categories/${categoryId}/content`),
    enabled: !!categoryId,
  })
}

export function useCollectionContent(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["entity-content", "collection", collectionId],
    queryFn: () =>
      sdk.client.fetch<EntityContentResponse>(`/store/collections/${collectionId}/content`),
    enabled: !!collectionId,
  })
}
```

---

## Module: Email Marketing System

The email system is **entirely backend-driven** — no store API endpoints are exposed. However, the storefront must implement specific pages and behaviors to support the automated email flows.

### Automated emails and their triggers

| Email | Trigger | Storefront requirement |
|-------|---------|----------------------|
| `order-confirmation` | Order placed | None (standard checkout) |
| `shipping-confirmation` | Fulfillment created | None |
| `delivery-confirmation` | Fulfillment delivered | None |
| `order-cancelled` | Order cancelled | None |
| `refund-confirmation` | Refund created | None |
| `password-reset` | Auth password reset | `/account/reset-password?token=...` page |
| `welcome-customer` | Customer registered | None (fires automatically) |
| `abandoned-cart` | Cart inactive > 1 hour | `/cart` page, see below |
| `review-request` | 5 days after order | `/account/orders/:id` page, see below |
| `win-back` | Customer inactive 30 days | None (disabled by default) |
| `repurchase-reminder` | Periodic cron | None (disabled by default) |

### Storefront base URL

All email links use `STORE_CORS` as the storefront base URL (first value when comma-separated). Set this env var on the backend to your production storefront domain:

```
STORE_CORS=https://yourstore.com
```

---

### Abandoned Cart Email

The backend job queries carts where `completed_at = null` and `updated_at < 1 hour ago` that have an email address. The email contains a **"Return to Cart"** button pointing to:

```
${STORE_CORS}/cart
```

**Storefront requirements:**

1. **Collect email early in checkout.** The cart must have an `email` field set for the job to pick it up. Set it as soon as the customer enters their email — do not wait until payment.

```typescript
// When customer enters email at checkout step 1
await sdk.store.cart.update(cartId, { email: customerEmail })
```

2. **`/cart` page must restore the cart** — When the user clicks the email link, the cart session cookie should restore their cart automatically (standard Medusa behavior). Ensure the cart cookie is set before the checkout session expires.

3. **Suppress duplicate reminders** — The current job sends to ALL matching carts every hour. To avoid spam, implement one of:
   - Store a `reminder_sent_at` flag in cart metadata after first reminder
   - Check `metadata.abandoned_cart_email_sent` before sending (requires updating `abandoned-cart.ts` on backend)

---

### Review Request Email

The backend job runs daily at 9 AM and sends to customers whose orders were created 5–6 days ago. The email contains a **"Write a Review"** button pointing to:

```
${STORE_CORS}/account/orders/:orderId
```

**Storefront requirements:**

1. **`/account/orders/:id` page** — Must exist and be accessible to logged-in customers. This is where customers click to leave product reviews.

2. **Review UI on the order detail page** — Each line item should have a "Rate this product" section. This is a frontend-only feature (or backed by a future `review` module on the backend).

---

### Password Reset Email

The reset link in the email points to:

```
${STORE_CORS}/account/reset-password?token=TOKEN&email=EMAIL
```

**Storefront requirements:**

The `/account/reset-password` page must:
1. Read `token` and `email` from query params
2. Show a form for new password input
3. Submit to the Medusa auth reset endpoint:

```typescript
await sdk.auth.resetPassword("customer", "emailpass", {
  token: searchParams.get("token")!,
  email: searchParams.get("email")!,
  password: newPassword,
})
```

---

### Welcome Customer Email

Fires automatically when a customer registers. No storefront action needed — but the email contains a link to the storefront home (`${STORE_CORS}`). Ensure the storefront is live and accessible from that URL before enabling this template.

---

## Integration Checklist

- [ ] SEO endpoints → call from **server components** / `generateMetadata`, not client hooks
- [ ] Entity Content → render with `dangerouslySetInnerHTML`, wrap in `prose` class
- [ ] Brand list → safe to cache with `staleTime: Infinity` (changes rarely)
- [ ] All custom routes → use `sdk.client.fetch()`, never raw `fetch()`
- [ ] `seo_metadata` and `entity_content` can be `null` — always guard before rendering
- [ ] **Reviews** → show star rating + review list on product detail page
- [ ] **Reviews** → review submission form (requires customer login)
- [ ] **Reviews** → handle `"pending"` status — inform customer their review is awaiting moderation
- [ ] **Wishlist** → heart/bookmark toggle on product cards (requires customer login)
- [ ] **Wishlist** → dedicated wishlist page at `/account/wishlist`
- [ ] **Search** → search bar using `/store/search` endpoint, handle `503` gracefully
- [ ] **Search** → category/collection filtering and sort options
- [ ] **Email: Abandoned cart** → collect cart email early (`sdk.store.cart.update`) before checkout completes
- [ ] **Email: Review request** → implement `/account/orders/:id` page with review UI per line item
- [ ] **Email: Password reset** → implement `/account/reset-password?token=&email=` page with reset form
- [ ] **Email: All links** → set `STORE_CORS` env var on backend to production storefront domain
- [ ] **Email: Welcome** → ensure storefront home page is publicly accessible at `STORE_CORS`

---

## Module: Product Review

Customer reviews with star rating and admin moderation. Only **approved** reviews are shown on the storefront.

### Data shape

```typescript
type Review = {
  id: string
  product_id: string
  customer_id: string | null
  rating: number            // 1–5
  title: string | null
  content: string
  first_name: string
  last_name: string
  status: "pending" | "approved" | "rejected"
  images: string[] | null   // array of image URLs
  created_at: string
  updated_at: string
}
```

### Store API endpoints

#### List approved reviews for a product

```
GET /store/products/:id/reviews?limit=20&offset=0
```

Response:
```json
{
  "reviews": [ { ...Review } ],
  "count": 42,
  "limit": 20,
  "offset": 0,
  "average_rating": 4.3,
  "total_count": 42
}
```

#### Submit a review (requires authentication)

```
POST /store/products/:id/reviews
```

Body:
```json
{
  "rating": 5,
  "content": "Sản phẩm rất tốt!",
  "first_name": "Ngọc",
  "last_name": "Trần",
  "title": "Rất hài lòng",
  "images": ["https://..."]
}
```

- `rating` (1–5) and `content` are required. `title` and `images` are optional.
- New reviews have status `"pending"` — they only appear after admin approval.
- A confirmation email (`review-submitted`) is sent automatically.

### Usage patterns

```typescript
// Fetch reviews (public, no auth)
const data = await sdk.client.fetch<{
  reviews: Review[]
  average_rating: number
  total_count: number
  count: number
}>(`/store/products/${productId}/reviews?limit=10`)

// Submit a review (requires logged-in customer)
const { review } = await sdk.client.fetch<{ review: Review }>(
  `/store/products/${productId}/reviews`,
  { method: "POST", body: { rating: 5, content: "Great!", first_name: "An", last_name: "Nguyen" } }
)
```

---

## Module: Wishlist

Per-customer product wishlist. POST toggles: if the product is already in the wishlist, it gets removed.

### Store API endpoints (all require authentication)

#### Get wishlist

```
GET /store/customers/me/wishlist
```

Response:
```json
{
  "wishlist_items": [
    {
      "id": "wish_01...",
      "customer_id": "cus_01...",
      "product_id": "prod_01...",
      "product": { "id": "prod_01...", "title": "...", "handle": "...", "thumbnail": "...", "variants": [...] }
    }
  ]
}
```

#### Add / Toggle wishlist item

```
POST /store/customers/me/wishlist
```

Body:
```json
{ "product_id": "prod_01..." }
```

- If product is **not** in wishlist → adds it, returns `{ "wishlist_item": {...}, "added": true }`
- If product is **already** in wishlist → removes it, returns `{ ..., "added": false }`

#### Remove from wishlist

```
DELETE /store/customers/me/wishlist/:product_id
```

### Usage patterns

```typescript
// Get wishlist
const { wishlist_items } = await sdk.client.fetch<{ wishlist_items: WishlistItem[] }>(
  "/store/customers/me/wishlist"
)

// Toggle wishlist (add or remove)
const result = await sdk.client.fetch<{ added: boolean }>(
  "/store/customers/me/wishlist",
  { method: "POST", body: { product_id: "prod_01..." } }
)

// Explicit remove
await sdk.client.fetch(`/store/customers/me/wishlist/${productId}`, { method: "DELETE" })
```

---

## Module: MeiliSearch (Product Search)

Full-text search powered by MeiliSearch with Vietnamese language support.

### Store API endpoint

```
GET /store/search?q=túi xách&limit=20&offset=0&category_id=...&collection_id=...&sort=price:asc
```

Response:
```json
{
  "hits": [
    {
      "id": "prod_01...",
      "title": "Túi xách da",
      "handle": "tui-xach-da",
      "thumbnail": "https://...",
      "description": "...",
      "status": "published",
      "category_ids": ["pcat_01..."],
      "collection_id": "pcol_01...",
      "variants": [...]
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0,
  "query": "túi xách"
}
```

Query params:
- `q` — search query (supports Vietnamese)
- `limit` / `offset` — pagination
- `category_id` — filter by category
- `collection_id` — filter by collection
- `sort` — e.g. `price:asc`, `price:desc`, `created_at:desc`

### Usage patterns

```typescript
// Basic search
const { hits, total } = await sdk.client.fetch<{ hits: Product[]; total: number }>(
  `/store/search?q=${encodeURIComponent(query)}&limit=20`
)

// Filtered search
const { hits } = await sdk.client.fetch<{ hits: Product[]; total: number }>(
  `/store/search?q=&category_id=${categoryId}&sort=price:asc`
)
```

> **Note:** Search returns `503` if MeiliSearch is unavailable. Handle this gracefully in the storefront.

---

## Module: Custom Payments (COD & Bank Transfer)

Hệ thống hỗ trợ 2 phương thức thanh toán manual tuỳ chỉnh. Frontend cần cấu hình UI hiển thị phù hợp cho luồng Checkout.

### 1. Thanh toán khi nhận hàng (COD)
- **ID Provider**: Thường là `cod` (hoặc `pp_cod_cod` tuỳ cấu hình lúc Seed).
- Luồng Cart: Người dùng chọn COD, checkout bình thường.
- Không cần hiển thị thông tin gì thêm, trạng thái đơn hàng sẽ chờ admin xử lý (Awaiting Payment).

### 2. Chuyển khoản ngân hàng (Bank Transfer)
- **ID Provider**: `bank-transfer` (hoặc `pp_bank-transfer_bank-transfer`).
- Khi Frontend gọi API khởi tạo `PaymentSession` để chọn phương thức `bank-transfer`, Server sẽ trả về cục `data` chứa thông tin Ngân hàng của Shop để Frontend render.

**Dữ liệu trả về Frontend có dạng:**
```json
{
  "payment_session": {
    "id": "...",
    "provider_id": "bank-transfer",
    "data": {
      "method": "bank-transfer",
      "bank_name": "Vietcombank",
      "account_number": "1122334455",
      "account_holder": "TINA SHOP",
      "bank_branch": "Hà Nội",
      "amount": 500000,
      "currency_code": "vnd"
    }
  }
}
```

**Storefront Requirements:**
- Ở trang **Checkout (bước Payment)** hoặc trang **Order Status (Thành công)**, Frontend hãy parse trường `data` trong Payment Session hiện tại nếu ID là Bank Transfer để vẽ một box hiển thị "Vui lòng chuyển khoản vào số tài khoản: ... Ngân hàng: ... Chủ tk: ..." cùng mã đơn hàng (Order Display ID) làm nội dung chuyển khoản.
- Việc gửi **Email Thông tin chuyển khoản** cho khách hàng đã được Backend xử lý ngầm (Subscriber). Frontend không cần làm gì thêm ở bước gửi thư.

---

## Complete Type Reference

```typescript
type Brand = {
  id: string
  name: string
  handle: string
  description: string | null
  content: string | null
  logo_url: string | null
}

type SeoMetadata = {
  id: string
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  canonical_url: string | null
  handle: string | null
}

type EntityContent = {
  id: string
  content: string | null
}

type Review = {
  id: string
  product_id: string
  customer_id: string | null
  rating: number
  title: string | null
  content: string
  first_name: string
  last_name: string
  status: "pending" | "approved" | "rejected"
  images: string[] | null
  created_at: string
  updated_at: string
}

type WishlistItem = {
  id: string
  customer_id: string
  product_id: string
  product: Product | null  // enriched with product data on GET
}
```

---

## Vietnamese Address API

> **Breaking change (3-tier):** Routes now return Nhanh.vn integer IDs (`id: number`), not old province codes. The dropdown is now 3-tier: Province → District → Ward. Old 2-tier shape (`code`, `codename`) is gone.

Cascading dropdown để khách chọn địa chỉ VN (3 cấp: Tỉnh/TP → Quận/Huyện → Phường/Xã). Data source là Nhanh.vn location API v1, cached in-memory 24h.

Không cần header auth hay publishable key.

### Endpoints

```
GET /store/vn-address/provinces
GET /store/vn-address/districts?provinceId={nhanhCityId}
GET /store/vn-address/wards?districtId={nhanhDistrictId}
```

### Response format

```typescript
// GET /store/vn-address/provinces
{
  provinces: [
    { id: 123, name: "Thành phố Hồ Chí Minh" },
    { id: 124, name: "Thành phố Hà Nội" },
    // ...
  ]
}

// GET /store/vn-address/districts?provinceId=123
{
  districts: [
    { id: 1442, name: "Quận 1" },
    { id: 1443, name: "Quận 3" },
    // ...
  ]
}

// GET /store/vn-address/wards?districtId=1442
{
  wards: [
    { id: 20001, name: "Phường Tân Định" },
    { id: 20002, name: "Phường Đa Kao" },
    // ...
  ]
}
```

### Mapping vào Medusa address fields

> **Quan trọng:** Phải lưu Nhanh integer IDs vào `shipping_address.metadata` — chúng được dùng khi push order sang Nhanh. Thiếu các IDs này, order push sẽ fail.

```typescript
// Khi khách submit form địa chỉ, map như sau:
const address = {
  country_code: "vn",
  province: selectedProvince.name,    // e.g. "Thành phố Hồ Chí Minh"
  city: selectedWard.name,            // e.g. "Phường Tân Định"
  address_1: streetAddress,           // e.g. "123 Nguyễn Huệ"
  postal_code: "",
  // REQUIRED for Nhanh order push:
  metadata: {
    nhanh_city_id: selectedProvince.id,     // Nhanh province integer ID
    nhanh_district_id: selectedDistrict.id, // Nhanh district integer ID
    nhanh_ward_id: selectedWard.id,         // Nhanh ward integer ID
    // Optional human-readable labels:
    province_name: selectedProvince.name,
    district_name: selectedDistrict.name,
    ward_name: selectedWard.name,
  },
}
```

### Ví dụ React

```tsx
const [provinces, setProvinces] = useState([])
const [districts, setDistricts] = useState([])
const [wards, setWards] = useState([])
const [selectedProvince, setSelectedProvince] = useState(null)
const [selectedDistrict, setSelectedDistrict] = useState(null)

useEffect(() => {
  fetch("/store/vn-address/provinces")
    .then(r => r.json())
    .then(d => setProvinces(d.provinces))
}, [])

const handleProvinceChange = async (province) => {
  setSelectedProvince(province)
  setDistricts([])
  setWards([])
  setSelectedDistrict(null)
  const res = await fetch(`/store/vn-address/districts?provinceId=${province.id}`)
  const data = await res.json()
  setDistricts(data.districts)
}

const handleDistrictChange = async (district) => {
  setSelectedDistrict(district)
  setWards([])
  const res = await fetch(`/store/vn-address/wards?districtId=${district.id}`)
  const data = await res.json()
  setWards(data.wards)
}
```

---

## Shipping Options

### Cấu trúc shipping

| Phương thức | Vùng | Phí mặc định | Freeship |
|---|---|---|---|
| Giao hàng tiêu chuẩn (3-5 ngày) | Toàn quốc | 30,000 VND | Đơn ≥ 300,000 VND |
| Giao hàng hoả tốc (4h) | Chỉ TP.HCM | 50,000 VND | Đơn ≥ 500,000 VND |

Medusa tự lọc shipping options dựa trên `province` trong shipping address của cart.

### Thay đổi phí ship

Phí ship được cấu hình qua ENV vars (chỉ áp dụng khi chạy seed):
```env
SHIPPING_STANDARD_PRICE=30000
SHIPPING_EXPRESS_PRICE=50000
FREE_SHIP_STANDARD_THRESHOLD=300000
FREE_SHIP_EXPRESS_THRESHOLD=500000
```

Để thay đổi phí sau khi đã seed: Admin UI → **Settings → Locations → [Kho Hà Nội] → Shipping Options**.

---

## Promotions (Mã giảm giá)

### Áp dụng promo code vào cart

```typescript
// Áp dụng mã giảm giá
const res = await fetch(`/store/carts/${cartId}/promotions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ code: "WELCOME10" }),
})
const { cart } = await res.json()

// Xoá mã giảm giá
await fetch(`/store/carts/${cartId}/promotions`, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ code: "WELCOME10" }),
})
```

### Cart response sau khi apply promotion

```typescript
// Discount hiển thị trong cart.discount_total
// Chi tiết adjustments trong từng item:
cart.items[0].adjustments = [
  {
    id: "adj_xxx",
    amount: -25000,           // số tiền giảm
    promotion_id: "prm_xxx",
    code: "WELCOME10",
  }
]
```

### Promotions mẫu (seed)

Chạy `npx medusa exec src/scripts/seed-promotions.ts` để tạo:

| Code | Loại | Giá trị |
|---|---|---|
| `WELCOME10` | % off toàn đơn | Giảm 10% |
| `FREESHIP` | Miễn phí ship | Giảm tối đa 50,000 VND phí ship |
| `50KOFF` | Số tiền cố định | Giảm 50,000 VND (chỉ VND) |

Tạo thêm promotions: Admin UI → **Promotions → Create**.
