import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  linkProductToBrandWorkflow,
  unlinkProductFromBrandWorkflow,
} from "../../../../../workflows/link-product-to-brand"
import { LinkProductToBrandType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<LinkProductToBrandType>,
  res: MedusaResponse
) => {
  await linkProductToBrandWorkflow(req.scope).run({
    input: {
      product_id: req.validatedBody.product_id,
      brand_id: req.params.id,
    },
  })

  res.json({ success: true })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest<LinkProductToBrandType>,
  res: MedusaResponse
) => {
  await unlinkProductFromBrandWorkflow(req.scope).run({
    input: {
      product_id: req.validatedBody.product_id,
      brand_id: req.params.id,
    },
  })

  res.json({ success: true })
}
