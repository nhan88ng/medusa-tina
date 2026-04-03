import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SEO_MODULE } from "../../modules/seo"
import SeoModuleService from "../../modules/seo/service"

export const deleteSeoMetadataStep = createStep(
  "delete-seo-metadata-step",
  async (id: string, { container }) => {
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    const previousData = await seoService.retrieveSeoMetadata(id)
    await seoService.deleteSeoMetadatas(id)
    return new StepResponse({ id, deleted: true }, previousData)
  },
  async (previousData, { container }) => {
    if (!previousData) return
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    await seoService.createSeoMetadatas(previousData)
  }
)
