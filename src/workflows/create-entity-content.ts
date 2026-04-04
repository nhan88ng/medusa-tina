import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createEntityContentStep } from "./steps/create-entity-content"

type CreateEntityContentWorkflowInput = {
  content?: string
}

export const createEntityContentWorkflow = createWorkflow(
  "create-entity-content",
  function (input: CreateEntityContentWorkflowInput) {
    const entityContent = createEntityContentStep(input)
    return new WorkflowResponse(entityContent)
  }
)
