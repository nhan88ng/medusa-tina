import { z } from "zod"

export const CreateEntityContentSchema = z.object({
  entity_type: z.enum(["product", "category", "collection"]),
  entity_id: z.string().min(1),
  content: z.string().optional(),
})

export type CreateEntityContentType = z.infer<typeof CreateEntityContentSchema>

export const UpdateEntityContentSchema = z.object({
  content: z.string().optional(),
})

export type UpdateEntityContentType = z.infer<typeof UpdateEntityContentSchema>
