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
- [ ] **Email: Abandoned cart** → collect cart email early (`sdk.store.cart.update`) before checkout completes
- [ ] **Email: Review request** → implement `/account/orders/:id` page with review UI per line item
- [ ] **Email: Password reset** → implement `/account/reset-password?token=&email=` page with reset form
- [ ] **Email: All links** → set `STORE_CORS` env var on backend to production storefront domain
- [ ] **Email: Welcome** → ensure storefront home page is publicly accessible at `STORE_CORS`

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
```
