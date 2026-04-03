import { Modules } from "@medusajs/framework/utils"
import {
  createRemoteLinkStep,
  dismissRemoteLinkStep,
} from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../modules/brand"
import { SEO_MODULE } from "../modules/seo"

type LinkSeoToEntityInput = {
  seo_metadata_id: string
  entity_type: "product" | "brand" | "category" | "collection"
  entity_id: string
}

export const linkSeoToEntityWorkflow = createWorkflow(
  "link-seo-to-entity",
  function (input: LinkSeoToEntityInput) {
    const linkData = transform({ input }, ({ input }) => {
      if (input.entity_type === "product") {
        return [
          {
            [Modules.PRODUCT]: {
              product_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else if (input.entity_type === "brand") {
        return [
          {
            [BRAND_MODULE]: {
              brand_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else if (input.entity_type === "collection") {
        return [
          {
            [Modules.PRODUCT]: {
              product_collection_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else {
        return [
          {
            [Modules.PRODUCT]: {
              product_category_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      }
    })

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)

export const unlinkSeoFromEntityWorkflow = createWorkflow(
  "unlink-seo-from-entity",
  function (input: LinkSeoToEntityInput) {
    const linkData = transform({ input }, ({ input }) => {
      if (input.entity_type === "product") {
        return [
          {
            [Modules.PRODUCT]: {
              product_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else if (input.entity_type === "brand") {
        return [
          {
            [BRAND_MODULE]: {
              brand_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else if (input.entity_type === "collection") {
        return [
          {
            [Modules.PRODUCT]: {
              product_collection_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      } else {
        return [
          {
            [Modules.PRODUCT]: {
              product_category_id: input.entity_id,
            },
            [SEO_MODULE]: {
              seo_metadata_id: input.seo_metadata_id,
            },
          },
        ]
      }
    })

    dismissRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)
