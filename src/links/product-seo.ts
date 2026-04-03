import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import SeoModule from "../modules/seo"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: SeoModule.linkable.seoMetadata,
    deleteCascade: true,
  }
)
