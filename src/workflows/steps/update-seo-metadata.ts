import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SEO_MODULE } from "../../modules/seo"
import SeoModuleService from "../../modules/seo/service"

type UpdateSeoMetadataInput = {
  id: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  handle?: string
}

export const updateSeoMetadataStep = createStep(
  "update-seo-metadata-step",
  async (input: UpdateSeoMetadataInput, { container }) => {
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    const previousData = await seoService.retrieveSeoMetadata(input.id)
    const seoMetadata = await seoService.updateSeoMetadatas(input)
    return new StepResponse(seoMetadata, previousData)
  },
  async (previousData, { container }) => {
    if (!previousData) return
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    await seoService.updateSeoMetadatas(previousData)
  }
)
