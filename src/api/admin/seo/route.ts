import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createSeoMetadataWorkflow } from "../../../workflows/create-seo-metadata"
import { linkSeoToEntityWorkflow } from "../../../workflows/link-seo-metadata"
import { CreateSeoMetadataType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: seoMetadatas } = await query.graph({
    entity: "seo_metadata",
    fields: ["id", "meta_title", "meta_description", "meta_keywords", "og_title", "og_description", "og_image", "canonical_url", "handle"],
  })

  res.json({ seo_metadatas: seoMetadatas })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateSeoMetadataType>,
  res: MedusaResponse
) => {
  const { entity_type, entity_id, ...seoData } = req.validatedBody

  const { result: seoMetadata } = await createSeoMetadataWorkflow(req.scope).run({
    input: seoData,
  })

  await linkSeoToEntityWorkflow(req.scope).run({
    input: {
      seo_metadata_id: seoMetadata.id,
      entity_type,
      entity_id,
    },
  })

  res.json({ seo_metadata: seoMetadata })
}
