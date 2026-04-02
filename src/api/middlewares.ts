import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { CreateBrandSchema, UpdateBrandSchema, LinkProductToBrandSchema } from "./admin/brands/validators"

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
  ],
})
