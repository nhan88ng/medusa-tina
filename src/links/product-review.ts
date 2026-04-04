import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductReviewModule from "../modules/product-review"

export default defineLink(ProductModule.linkable.product, {
  linkable: ProductReviewModule.linkable.review,
  isList: true,
  deleteCascade: true,
})
