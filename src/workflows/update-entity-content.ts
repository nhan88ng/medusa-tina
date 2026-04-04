import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateEntityContentStep } from "./steps/update-entity-content"

type UpdateEntityContentWorkflowInput = {
  id: string
  content?: string
}

export const updateEntityContentWorkflow = createWorkflow(
  "update-entity-content",
  function (input: UpdateEntityContentWorkflowInput) {
    const entityContent = updateEntityContentStep(input)
    return new WorkflowResponse(entityContent)
  }
)
