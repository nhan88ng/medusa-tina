import { Logger } from "@medusajs/framework/types"

type MeilisearchOptions = {
  host: string
  apiKey: string
  productIndexName?: string
}

type InjectedDependencies = {
  logger: Logger
}

class MeilisearchModuleService {
  protected logger_: Logger
  protected options_: MeilisearchOptions
  protected productIndex_: string

  constructor(
    { logger }: InjectedDependencies,
    options: MeilisearchOptions
  ) {
    this.logger_ = logger
    this.options_ = options
    this.productIndex_ = options.productIndexName || "products"
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getClient(): Promise<any> {
    const { Meilisearch } = await import("meilisearch")
    return new Meilisearch({
      host: this.options_.host,
      apiKey: this.options_.apiKey,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getIndex(): Promise<any> {
    const client = await this.getClient()
    return client.index(this.productIndex_)
  }

  async indexProducts(products: Record<string, unknown>[]): Promise<void> {
    if (!products.length) return
    const index = await this.getIndex()
    await index.addDocuments(products, { primaryKey: "id" })
    this.logger_.info(`[meilisearch] Indexed ${products.length} products`)
  }

  async deleteProducts(productIds: string[]): Promise<void> {
    if (!productIds.length) return
    const index = await this.getIndex()
    await index.deleteDocuments(productIds)
    this.logger_.info(
      `[meilisearch] Deleted ${productIds.length} products from index`
    )
  }

  async searchProducts(
    query: string,
    options?: {
      filters?: string
      sort?: string[]
      limit?: number
      offset?: number
    }
  ) {
    const index = await this.getIndex()
    return index.search(query, {
      filter: options?.filters,
      sort: options?.sort,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      attributesToHighlight: ["title", "description"],
    })
  }

  async configureIndex(): Promise<void> {
    try {
      const index = await this.getIndex()
      await index.updateSettings({
        searchableAttributes: [
          "title",
          "description",
          "handle",
          "brand_name",
          "category_names",
          "collection_title",
        ],
        filterableAttributes: [
          "status",
          "category_ids",
          "collection_id",
          "brand_id",
        ],
        sortableAttributes: ["created_at", "title", "min_price"],
        displayedAttributes: [
          "id",
          "title",
          "handle",
          "description",
          "thumbnail",
          "status",
          "brand_id",
          "brand_name",
          "category_ids",
          "category_names",
          "collection_id",
          "collection_title",
          "min_price",
          "max_price",
          "created_at",
        ],
      })
      this.logger_.info("[meilisearch] Index configured successfully")
    } catch (error: any) {
      this.logger_.error(
        `[meilisearch] Failed to configure index: ${error.message}`
      )
    }
  }

  async getStats() {
    try {
      const index = await this.getIndex()
      return index.getStats()
    } catch {
      return null
    }
  }
}

export default MeilisearchModuleService
