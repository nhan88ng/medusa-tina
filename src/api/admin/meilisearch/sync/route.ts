import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch"
import MeilisearchModuleService from "../../../../modules/meilisearch/service"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  let meilisearch: MeilisearchModuleService
  try {
    meilisearch = req.scope.resolve(MEILISEARCH_MODULE)
  } catch {
    return res.status(503).json({ message: "MeiliSearch module not available" })
  }

  logger.info("[meilisearch] Admin triggered full sync")

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

  await meilisearch.indexProducts(documents)

  res.json({
    success: true,
    indexed_count: documents.length,
    message: `Indexed ${documents.length} published products`,
  })
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  let meilisearch: MeilisearchModuleService
  try {
    meilisearch = req.scope.resolve(MEILISEARCH_MODULE)
  } catch {
    return res.status(503).json({ message: "MeiliSearch module not available" })
  }

  const stats = await meilisearch.getStats()
  res.json({ stats })
}
