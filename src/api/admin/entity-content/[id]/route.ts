import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateEntityContentWorkflow } from "../../../../workflows/update-entity-content"
import { deleteEntityContentWorkflow } from "../../../../workflows/delete-entity-content"
import { UpdateEntityContentType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [entityContent] } = await query.graph({
    entity: "entity_content",
    fields: ["id", "content"],
    filters: { id: req.params.id },
  })

  res.json({ entity_content: entityContent })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateEntityContentType>,
  res: MedusaResponse
) => {
  const { result } = await updateEntityContentWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...req.validatedBody,
    },
  })

  res.json({ entity_content: result })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteEntityContentWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "entity_content", deleted: true })
}
