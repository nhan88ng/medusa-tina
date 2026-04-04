import { z } from "zod"

export const AddToWishlistSchema = z.object({
  product_id: z.string().min(1),
})
export type AddToWishlistSchema = z.infer<typeof AddToWishlistSchema>
