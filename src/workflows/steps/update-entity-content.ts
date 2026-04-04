import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENTITY_CONTENT_MODULE } from "../../modules/entity-content"
import EntityContentModuleService from "../../modules/entity-content/service"

type UpdateEntityContentInput = {
  id: string
  content?: string
}

export const updateEntityContentStep = createStep(
  "update-entity-content-step",
  async (input: UpdateEntityContentInput, { container }) => {
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    const previousData = await service.retrieveEntityContent(input.id)
    const entityContent = await service.updateEntityContents(input)
    return new StepResponse(entityContent, previousData)
  },
  async (previousData, { container }) => {
    if (!previousData) return
    const service: EntityContentModuleService = container.resolve(ENTITY_CONTENT_MODULE)
    await service.updateEntityContents(previousData)
  }
)
