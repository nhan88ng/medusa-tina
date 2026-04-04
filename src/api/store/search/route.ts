import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import MeilisearchModuleService from "../../../modules/meilisearch/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string) || ""
  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0
  const category_id = req.query.category_id as string | undefined
  const collection_id = req.query.collection_id as string | undefined
  const sort = req.query.sort as string | undefined

  let meilisearch: MeilisearchModuleService
  try {
    meilisearch = req.scope.resolve(MEILISEARCH_MODULE)
  } catch {
    return res.status(503).json({ message: "Search service unavailable" })
  }

  const filters: string[] = []
  if (category_id) filters.push(`category_ids = "${category_id}"`)
  if (collection_id) filters.push(`collection_id = "${collection_id}"`)
  filters.push(`status = "published"`)

  const sortArr = sort ? [sort] : undefined

  const results = await meilisearch.searchProducts(q, {
    filters: filters.join(" AND "),
    sort: sortArr,
    limit,
    offset,
  })

  res.json({
    hits: results.hits,
    total: results.estimatedTotalHits ?? results.totalHits ?? 0,
    limit,
    offset,
    query: q,
  })
}
