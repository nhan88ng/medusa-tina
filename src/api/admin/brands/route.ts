import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createBrandWorkflow } from "../../../workflows/create-brand"
import { CreateBrandType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: brands } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "description", "content", "logo_url", "products.*"],
  })

  res.json({ brands })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateBrandType>,
  res: MedusaResponse
) => {
  const { result } = await createBrandWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ brand: result })
}
