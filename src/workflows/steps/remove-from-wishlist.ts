import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import WishlistModuleService from "../../modules/wishlist/service"

export type RemoveFromWishlistStepInput = {
  customer_id: string
  product_id: string
}

export const removeFromWishlistStep = createStep(
  "remove-from-wishlist-step",
  async (input: RemoveFromWishlistStepInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [existing] = await wishlistService.listWishlistItems({
      customer_id: input.customer_id,
      product_id: input.product_id,
    })

    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Product not in wishlist"
      )
    }

    await wishlistService.deleteWishlistItems(existing.id)

    return new StepResponse({ id: existing.id, deleted: true })
  }
)
