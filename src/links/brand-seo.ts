import { defineLink } from "@medusajs/framework/utils"
import BrandModule from "../modules/brand"
import SeoModule from "../modules/seo"

export default defineLink(
  BrandModule.linkable.brand,
  {
    linkable: SeoModule.linkable.seoMetadata,
    deleteCascade: true,
  }
)
