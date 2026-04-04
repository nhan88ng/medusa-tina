import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateBrandWorkflow } from "../../../../workflows/update-brand"
import { deleteBrandWorkflow } from "../../../../workflows/delete-brand"
import { UpdateBrandType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [brand] } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "description", "content", "logo_url", "products.*"],
    filters: { id: req.params.id },
  })

  res.json({ brand })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateBrandType>,
  res: MedusaResponse
) => {
  const { result } = await updateBrandWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...req.validatedBody,
    },
  })

  res.json({ brand: result })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteBrandWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "brand", deleted: true })
}
