import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateSeoMetadataStep } from "./steps/update-seo-metadata"

type UpdateSeoMetadataWorkflowInput = {
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

export const updateSeoMetadataWorkflow = createWorkflow(
  "update-seo-metadata",
  function (input: UpdateSeoMetadataWorkflowInput) {
    const seoMetadata = updateSeoMetadataStep(input)
    return new WorkflowResponse(seoMetadata)
  }
)
