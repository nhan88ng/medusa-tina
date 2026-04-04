import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../modules/wishlist/service"
import { addToWishlistWorkflow } from "../../../../../workflows/add-to-wishlist"
import { removeFromWishlistWorkflow } from "../../../../../workflows/remove-from-wishlist"
import { AddToWishlistSchema } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customer_id = req.auth_context.actor_id
  const wishlistService: WishlistModuleService =
    req.scope.resolve(WISHLIST_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const items = await wishlistService.listWishlistItems({ customer_id })

  const product_ids = items.map((i) => i.product_id)

  let products: any[] = []
  if (product_ids.length > 0) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "status",
        "variants.id",
        "variants.title",
        "variants.prices.*",
      ],
      filters: { id: product_ids },
    })
    products = data
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  const wishlistItems = items.map((item) => ({
    ...item,
    product: productMap.get(item.product_id) ?? null,
  }))

  res.json({ wishlist_items: wishlistItems })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AddToWishlistSchema>,
  res: MedusaResponse
) {
  const customer_id = req.auth_context.actor_id
  const { product_id } = req.validatedBody

  try {
    const { result: item } = await addToWishlistWorkflow(req.scope).run({
      input: { customer_id, product_id },
    })
    res.status(201).json({ wishlist_item: item, added: true })
  } catch (error: any) {
    if (error.type === "duplicate_error") {
      // Already in wishlist — remove it (toggle)
      const { result } = await removeFromWishlistWorkflow(req.scope).run({
        input: { customer_id, product_id },
      })
      res.json({ ...result, added: false })
    } else {
      throw error
    }
  }
}
