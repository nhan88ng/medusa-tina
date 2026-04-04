import { MedusaContainer } from "@medusajs/framework/types"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import MeilisearchModuleService from "../modules/meilisearch/service"

export default async function meilisearchSetup(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")
  let meilisearch: MeilisearchModuleService

  try {
    meilisearch = container.resolve(MEILISEARCH_MODULE)
  } catch {
    logger.warn("[meilisearch-setup] MeiliSearch module not available, skipping")
    return
  }

  try {
    // 1. Configure index settings
    await meilisearch.configureIndex()

    // 2. Full sync of all published products
    logger.info("[meilisearch-setup] Starting full product index sync...")

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
        "variants.prices.amount",
        "variants.prices.currency_code",
        "categories.id",
        "categories.name",
        "collection.id",
        "collection.title",
      ],
      filters: { status: "published" },
    })

    const documents = products.map((product: any) => {
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
        brand_id: null,
        brand_name: null,
        category_ids: product.categories?.map((c: any) => c.id) ?? [],
        category_names: product.categories?.map((c: any) => c.name) ?? [],
        collection_id: product.collection?.id ?? null,
        collection_title: product.collection?.title ?? null,
        min_price: prices.length ? Math.min(...prices) : null,
        max_price: prices.length ? Math.max(...prices) : null,
        created_at: new Date(product.created_at).getTime(),
      }
    })

    if (documents.length > 0) {
      await meilisearch.indexProducts(documents)
      logger.info(
        `[meilisearch-setup] Indexed ${documents.length} published products`
      )
    } else {
      logger.info("[meilisearch-setup] No published products to index")
    }
  } catch (error: any) {
    logger.error(`[meilisearch-setup] Setup failed: ${error.message}`)
  }
}

export const config = {
  name: "meilisearch-setup",
  schedule: "0 0 1 1 *", // Jan 1 (acts as once on first run)
  numberOfExecutions: 1,
}
