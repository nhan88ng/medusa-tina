import { MedusaService } from "@medusajs/framework/utils"
import SeoMetadata from "./models/seo-metadata"

class SeoModuleService extends MedusaService({
  SeoMetadata,
}) {}

export default SeoModuleService
