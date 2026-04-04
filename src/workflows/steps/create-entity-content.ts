import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENTITY_CONTENT_MODULE } from "../../modules/entity-content"
import EntityContentModuleService from "../../modules/entity-content/service"

type CreateEntityContentInput = {
  content?: string
}

export const createEntityContentStep = createStep(
  "create-entity-content-step",
  async (input: CreateEntityContentInput, { container }) => {
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    const entityContent = await service.createEntityContents(input)
    return new StepResponse(entityContent, entityContent.id)
  },
  async (entityContentId: string | undefined, { container }) => {
    if (!entityContentId) return
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    await service.deleteEntityContents(entityContentId)
  }
)
