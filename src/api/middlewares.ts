import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
  authenticate,
} from "@medusajs/framework/http"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { CreateBrandSchema, UpdateBrandSchema, LinkProductToBrandSchema } from "./admin/brands/validators"
import { CreateSeoMetadataSchema, UpdateSeoMetadataSchema } from "./admin/seo/validators"
import { CreateEntityContentSchema, UpdateEntityContentSchema } from "./admin/entity-content/validators"
import { CreateEmailTemplateSchema, UpdateEmailTemplateSchema, TestEmailTemplateSchema } from "./admin/email-templates/validators"
import { UpdateReviewSchema, GetAdminReviewsSchema } from "./admin/reviews/validators"
import { CreateStoreReviewSchema } from "./store/products/[id]/reviews/validators"
import { AddToWishlistSchema } from "./store/customers/me/wishlist/validators"
import { SearchQuerySchema } from "./store/search/validators"

export default defineMiddlewares({
  routes: [
    // Ensure payment_providers is always returned in region detail response.
    // The Medusa admin UI sometimes fetches /admin/regions/:id without a
    // fields param, which omits payment_providers from the default field set.
    // Custom middlewares run AFTER the built-in validateAndTransformQuery,
    // so we patch req.queryConfig.fields directly at this point.
    {
      matcher: "/admin/regions/:id",
      method: "GET",
      middlewares: [
        (req: any, _res, next) => {
          const queryConfig = req.queryConfig
          if (queryConfig?.fields && !queryConfig.fields.includes("payment_providers.*")) {
            queryConfig.fields = [...queryConfig.fields, "payment_providers.*"]
            req.remoteQueryConfig = queryConfig
          }
          next()
        },
      ],
    },

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

    // ===== Reviews (Admin) =====
    {
      matcher: "/admin/reviews",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetAdminReviewsSchema, {
          defaults: ["id", "product_id", "customer_id", "rating", "status", "title", "content", "first_name", "last_name", "images", "created_at"],
          isList: true,
          defaultLimit: 50,
        }),
      ],
    },
    {
      matcher: "/admin/reviews/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateReviewSchema)],
    },

    // ===== Reviews (Store) =====
    {
      matcher: "/store/products/:id/reviews",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(CreateStoreReviewSchema),
      ],
    },

    // ===== Wishlist (Store) =====
    {
      matcher: "/store/customers/me/wishlist",
      method: "POST",
      middlewares: [validateAndTransformBody(AddToWishlistSchema)],
    },

    // ===== Search (Store) =====
    // isList: false — returns MeiliSearch hits in a custom shape, not a Medusa paginated list.
    {
      matcher: "/store/search",
      method: "GET",
      middlewares: [validateAndTransformQuery(SearchQuerySchema, { isList: false })],
    },
  ],
})
