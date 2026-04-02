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

type LinkProductToBrandInput = {
  product_id: string
  brand_id: string
}

export const linkProductToBrandWorkflow = createWorkflow(
  "link-product-to-brand",
  function (input: LinkProductToBrandInput) {
    const linkData = transform({ input }, ({ input }) => {
      return [
        {
          [Modules.PRODUCT]: {
            product_id: input.product_id,
          },
          [BRAND_MODULE]: {
            brand_id: input.brand_id,
          },
        },
      ]
    })

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)

type UnlinkProductFromBrandInput = {
  product_id: string
  brand_id: string
}

export const unlinkProductFromBrandWorkflow = createWorkflow(
  "unlink-product-from-brand",
  function (input: UnlinkProductFromBrandInput) {
    const linkData = transform({ input }, ({ input }) => {
      return [
        {
          [Modules.PRODUCT]: {
            product_id: input.product_id,
          },
          [BRAND_MODULE]: {
            brand_id: input.brand_id,
          },
        },
      ]
    })

    dismissRemoteLinkStep(linkData)

    return new WorkflowResponse(linkData)
  }
)
