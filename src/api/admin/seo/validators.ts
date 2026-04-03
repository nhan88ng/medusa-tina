import { z } from "zod"

export const CreateSeoMetadataSchema = z.object({
  entity_type: z.enum(["product", "brand", "category", "collection"]),
  entity_id: z.string().min(1),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  canonical_url: z.string().optional(),
  handle: z.string().optional(),
})

export type CreateSeoMetadataType = z.infer<typeof CreateSeoMetadataSchema>

export const UpdateSeoMetadataSchema = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  canonical_url: z.string().optional(),
  handle: z.string().optional(),
})

export type UpdateSeoMetadataType = z.infer<typeof UpdateSeoMetadataSchema>
