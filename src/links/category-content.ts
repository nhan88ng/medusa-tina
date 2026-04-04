import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import EntityContentModule from "../modules/entity-content"

export default defineLink(
  ProductModule.linkable.productCategory,
  {
    linkable: EntityContentModule.linkable.entityContent,
    deleteCascade: true,
  }
)
