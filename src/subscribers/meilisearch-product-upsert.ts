import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import MeilisearchModuleService from "../modules/meilisearch/service"

async function buildProductDocument(productId: string, container: any) {
  const query = container.resolve("query")

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "description",
      "thumbnail",
      "status",
      "created_at",
      "variants.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "categories.id",
      "categories.name",
      "collection.id",
      "collection.title",
    ],
    filters: { id: productId },
  })

  const product = products?.[0]
  if (!product) return null

  // Try to get brand from link
  let brand_id: string | null = null
  let brand_name: string | null = null
  try {
    const { data: brandLinks } = await query.graph({
      entity: "product",
      fields: ["brand.*"],
      filters: { id: productId },
    })
    const b = (brandLinks?.[0] as any)?.brand
    if (b) {
      brand_id = b.id
      brand_name = b.name
    }
  } catch {
    // Brand link not found
  }

  const prices = product.variants?.flatMap((v: any) =>
    (v.prices ?? [])
      .filter((p: any) => p.currency_code === "vnd")
      .map((p: any) => p.amount)
  ) ?? []

  return {
    id: product.id,
    title: product.title ?? "",
    handle: product.handle ?? "",
    description: product.description ?? "",
    thumbnail: product.thumbnail ?? null,
    status: product.status,
    brand_id,
    brand_name,
    category_ids: product.categories?.map((c: any) => c.id) ?? [],
    category_names: product.categories?.map((c: any) => c.name) ?? [],
    collection_id: product.collection?.id ?? null,
    collection_title: product.collection?.title ?? null,
    min_price: prices.length ? Math.min(...prices) : null,
    max_price: prices.length ? Math.max(...prices) : null,
    created_at: new Date(product.created_at).getTime(),
  }
}

export default async function syncProductToMeilisearch({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    const meilisearch: MeilisearchModuleService =
      container.resolve(MEILISEARCH_MODULE)

    const doc = await buildProductDocument(data.id, container)
    if (!doc) return

    await meilisearch.indexProducts([doc])
    logger.info(`[meilisearch] Synced product ${data.id}`)
  } catch (error: any) {
    logger.error(`[meilisearch] Sync failed for ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
