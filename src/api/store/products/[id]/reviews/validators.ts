import { z } from "zod"

export const CreateStoreReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  images: z.array(z.string().url()).optional(),
})
export type CreateStoreReviewSchema = z.infer<typeof CreateStoreReviewSchema>
