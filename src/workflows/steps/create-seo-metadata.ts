import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SEO_MODULE } from "../../modules/seo"
import SeoModuleService from "../../modules/seo/service"

type CreateSeoMetadataInput = {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  handle?: string
}

export const createSeoMetadataStep = createStep(
  "create-seo-metadata-step",
  async (input: CreateSeoMetadataInput, { container }) => {
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    const seoMetadata = await seoService.createSeoMetadatas(input)
    return new StepResponse(seoMetadata, seoMetadata.id)
  },
  async (seoMetadataId: string, { container }) => {
    const seoService: SeoModuleService = container.resolve(SEO_MODULE)
    await seoService.deleteSeoMetadatas(seoMetadataId)
  }
)
