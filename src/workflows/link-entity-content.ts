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
import { ENTITY_CONTENT_MODULE } from "../modules/entity-content"

type LinkEntityContentInput = {
  entity_content_id: string
  entity_type: "product" | "category" | "collection"
  entity_id: string
}

export const linkEntityContentWorkflow = createWorkflow(
  "link-entity-content",
  function (input: LinkEntityContentInput) {
    const linkData = transform({ input }, ({ input }) => {
      if (input.entity_type === "product") {
        return [
          {
            [Modules.PRODUCT]: {
              product_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      } else if (input.entity_type === "collection") {
        return [
          {
            [Modules.PRODUCT]: {
              product_collection_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      } else {
        return [
          {
            [Modules.PRODUCT]: {
              product_category_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      }
    })

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)

export const unlinkEntityContentWorkflow = createWorkflow(
  "unlink-entity-content",
  function (input: LinkEntityContentInput) {
    const linkData = transform({ input }, ({ input }) => {
      if (input.entity_type === "product") {
        return [
          {
            [Modules.PRODUCT]: {
              product_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      } else if (input.entity_type === "collection") {
        return [
          {
            [Modules.PRODUCT]: {
              product_collection_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      } else {
        return [
          {
            [Modules.PRODUCT]: {
              product_category_id: input.entity_id,
            },
            [ENTITY_CONTENT_MODULE]: {
              entity_content_id: input.entity_content_id,
            },
          },
        ]
      }
    })

    dismissRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)
