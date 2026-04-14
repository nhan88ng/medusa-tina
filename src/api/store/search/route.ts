import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import MeilisearchModuleService from "../../../modules/meilisearch/service"
import { buildSearchFilters } from "./filters"
import { SearchQuerySchema } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = SearchQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { q, limit, offset, category_id, collection_id, sort } = parsed.data

  let meilisearch: MeilisearchModuleService
  try {
    meilisearch = req.scope.resolve(MEILISEARCH_MODULE)
  } catch {
    return res.status(503).json({ message: "Search service unavailable" })
  }

  // IDs are already validated by the schema; buildSearchFilters adds the
  // published status guard and returns the safe array-filter format.
  const filterClauses = buildSearchFilters({ category_id, collection_id })
  const sortArr = sort ? [sort] : undefined

  const results = await meilisearch.searchProducts(q, {
    filters: filterClauses,
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
