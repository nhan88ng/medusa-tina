import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import MeilisearchModuleService from "../modules/meilisearch/service"

export default async function deleteProductFromMeilisearch({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    const meilisearch: MeilisearchModuleService =
      container.resolve(MEILISEARCH_MODULE)

    await meilisearch.deleteProducts([data.id])
    logger.info(`[meilisearch] Deleted product ${data.id} from index`)
  } catch (error: any) {
    logger.error(
      `[meilisearch] Delete failed for ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
