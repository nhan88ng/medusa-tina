import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { CreateBrandSchema, UpdateBrandSchema, LinkProductToBrandSchema } from "./admin/brands/validators"
import { CreateSeoMetadataSchema, UpdateSeoMetadataSchema } from "./admin/seo/validators"
import { CreateEntityContentSchema, UpdateEntityContentSchema } from "./admin/entity-content/validators"
import { CreateEmailTemplateSchema, UpdateEmailTemplateSchema, TestEmailTemplateSchema } from "./admin/email-templates/validators"

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
    {
      matcher: "/admin/entity-content",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateEntityContentSchema)],
    },
    {
      matcher: "/admin/entity-content/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateEntityContentSchema)],
    },
    {
      matcher: "/admin/email-templates",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateEmailTemplateSchema)],
    },
    {
      matcher: "/admin/email-templates/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateEmailTemplateSchema)],
    },
    {
      matcher: "/admin/email-templates/:id/test",
      method: "POST",
      middlewares: [validateAndTransformBody(TestEmailTemplateSchema)],
    },
  ],
})
