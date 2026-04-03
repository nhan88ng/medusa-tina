import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { CreateBrandSchema, UpdateBrandSchema, LinkProductToBrandSchema } from "./admin/brands/validators"
import { CreateSeoMetadataSchema, UpdateSeoMetadataSchema } from "./admin/seo/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateBrandSchema)],
    },
    {
      matcher: "/admin/brands/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateBrandSchema)],
    },
    {
      matcher: "/admin/brands/:id/products",
      method: "POST",
      middlewares: [validateAndTransformBody(LinkProductToBrandSchema)],
    },
    {
      matcher: "/admin/seo",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateSeoMetadataSchema)],
    },
    {
      matcher: "/admin/seo/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateSeoMetadataSchema)],
    },
  ],
})
