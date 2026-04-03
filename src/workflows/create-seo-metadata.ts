import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createSeoMetadataStep } from "./steps/create-seo-metadata"

type CreateSeoMetadataWorkflowInput = {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  handle?: string
}

export const createSeoMetadataWorkflow = createWorkflow(
  "create-seo-metadata",
  function (input: CreateSeoMetadataWorkflowInput) {
    const seoMetadata = createSeoMetadataStep(input)
    return new WorkflowResponse(seoMetadata)
  }
)
