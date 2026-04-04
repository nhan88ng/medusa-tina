import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateBrandStep } from "./steps/update-brand"

type UpdateBrandWorkflowInput = {
  id: string
  name?: string
  handle?: string
  description?: string
  content?: string
  logo_url?: string
}

export const updateBrandWorkflow = createWorkflow(
  "update-brand",
  function (input: UpdateBrandWorkflowInput) {
    const brand = updateBrandStep(input)
    return new WorkflowResponse(brand)
  }
)
