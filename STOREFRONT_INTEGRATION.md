# Storefront Integration Guide — Custom Medusa Modules

This document describes all custom modules built on top of this Medusa backend and how to consume them from the storefront. Read this before implementing any feature that touches brands, SEO metadata, or rich text content.

---

## Overview of Custom Modules

| Module | Purpose |
|--------|---------|
| **Brand** | Brand entities linked to products |
| **SEO Metadata** | Per-entity SEO fields (title, description, OG tags, etc.) linked to products, categories, collections, and brands |
| **Entity Content** | Rich text (HTML) content linked to products, categories, and collections |

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

## Integration Checklist

- [ ] SEO endpoints → call from **server components** / `generateMetadata`, not client hooks
- [ ] Entity Content → render with `dangerouslySetInnerHTML`, wrap in `prose` class
- [ ] Brand list → safe to cache with `staleTime: Infinity` (changes rarely)
- [ ] All custom routes → use `sdk.client.fetch()`, never raw `fetch()`
- [ ] `seo_metadata` and `entity_content` can be `null` — always guard before rendering

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
