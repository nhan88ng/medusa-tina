import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createEntityContentWorkflow } from "../../../workflows/create-entity-content"
import { linkEntityContentWorkflow } from "../../../workflows/link-entity-content"
import { CreateEntityContentType } from "./validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateEntityContentType>,
  res: MedusaResponse
) => {
  const { entity_type, entity_id, ...contentData } = req.validatedBody

  const { result: entityContent } = await createEntityContentWorkflow(req.scope).run({
    input: contentData,
  })

  await linkEntityContentWorkflow(req.scope).run({
    input: {
      entity_content_id: entityContent.id,
      entity_type,
      entity_id,
    },
  })

  res.json({ entity_content: entityContent })
}
