import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: brands } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "description", "content", "logo_url"],
  })

  res.json({ brands })
}
