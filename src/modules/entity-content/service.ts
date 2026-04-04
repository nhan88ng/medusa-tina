import { MedusaService } from "@medusajs/framework/utils"
import EntityContent from "./models/entity-content"

class EntityContentModuleService extends MedusaService({
  EntityContent,
}) {}

export default EntityContentModuleService
