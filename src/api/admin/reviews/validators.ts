import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const GetAdminReviewsSchema = createFindParams().merge(
  z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    product_id: z.string().optional(),
  })
)
export type GetAdminReviewsSchema = z.infer<typeof GetAdminReviewsSchema>

export const UpdateReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
})
export type UpdateReviewSchema = z.infer<typeof UpdateReviewSchema>
