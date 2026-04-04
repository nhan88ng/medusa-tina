import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENTITY_CONTENT_MODULE } from "../../modules/entity-content"
import EntityContentModuleService from "../../modules/entity-content/service"

export const deleteEntityContentStep = createStep(
  "delete-entity-content-step",
  async (id: string, { container }) => {
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    const previousData = await service.retrieveEntityContent(id)
    await service.deleteEntityContents(id)
    return new StepResponse({ id, deleted: true }, previousData)
  },
  async (previousData, { container }) => {
    if (!previousData) return
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    await service.createEntityContents(previousData)
  }
)
