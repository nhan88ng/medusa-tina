import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateSeoMetadataWorkflow } from "../../../../workflows/update-seo-metadata"
import { deleteSeoMetadataWorkflow } from "../../../../workflows/delete-seo-metadata"
import { UpdateSeoMetadataType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [seoMetadata] } = await query.graph({
    entity: "seo_metadata",
    fields: ["id", "meta_title", "meta_description", "meta_keywords", "og_title", "og_description", "og_image", "canonical_url"],
    filters: { id: req.params.id },
  })

  res.json({ seo_metadata: seoMetadata })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateSeoMetadataType>,
  res: MedusaResponse
) => {
  const { result } = await updateSeoMetadataWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...req.validatedBody,
    },
  })

  res.json({ seo_metadata: result })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteSeoMetadataWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "seo_metadata", deleted: true })
}
