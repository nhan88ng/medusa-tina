import { z } from "zod"

const safeUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), { message: "Only http/https URLs are allowed" })

export const CreateSeoMetadataSchema = z.object({
  entity_type: z.enum(["product", "brand", "category", "collection"]),
  entity_id: z.string().min(1),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: safeUrl.optional(),
  canonical_url: safeUrl.optional(),
})

export type CreateSeoMetadataType = z.infer<typeof CreateSeoMetadataSchema>

export const UpdateSeoMetadataSchema = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: safeUrl.optional(),
  canonical_url: safeUrl.optional(),
})

export type UpdateSeoMetadataType = z.infer<typeof UpdateSeoMetadataSchema>
