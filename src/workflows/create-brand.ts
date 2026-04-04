import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createBrandStep } from "./steps/create-brand"

type CreateBrandWorkflowInput = {
  name: string
  handle?: string
  description?: string
  content?: string
  logo_url?: string
}

export const createBrandWorkflow = createWorkflow(
  "create-brand",
  function (input: CreateBrandWorkflowInput) {
    const brand = createBrandStep(input)
    return new WorkflowResponse(brand)
  }
)
