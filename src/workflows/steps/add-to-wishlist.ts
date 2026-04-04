import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import WishlistModuleService from "../../modules/wishlist/service"

export type AddToWishlistStepInput = {
  customer_id: string
  product_id: string
}

export const addToWishlistStep = createStep(
  "add-to-wishlist-step",
  async (input: AddToWishlistStepInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [existing] = await wishlistService.listWishlistItems({
      customer_id: input.customer_id,
      product_id: input.product_id,
    })

    if (existing) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "Product already in wishlist"
      )
    }

    const item = await wishlistService.createWishlistItems({
      customer_id: input.customer_id,
      product_id: input.product_id,
    })

    return new StepResponse(item, item.id)
  },
  async (itemId: string, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)
    await wishlistService.deleteWishlistItems(itemId)
  }
)
