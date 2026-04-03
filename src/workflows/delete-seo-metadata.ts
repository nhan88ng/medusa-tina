import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteSeoMetadataStep } from "./steps/delete-seo-metadata"

export const deleteSeoMetadataWorkflow = createWorkflow(
  "delete-seo-metadata",
  function (input: { id: string }) {
    const result = deleteSeoMetadataStep(input.id)
    return new WorkflowResponse(result)
  }
)
