import { z } from "zod"

export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/

export const SearchQuerySchema = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  category_id: z
    .string()
    .regex(SAFE_ID_REGEX, "Invalid category_id")
    .optional(),
  collection_id: z
    .string()
    .regex(SAFE_ID_REGEX, "Invalid collection_id")
    .optional(),
  sort: z.string().optional(),
})

export type SearchQueryType = z.infer<typeof SearchQuerySchema>
