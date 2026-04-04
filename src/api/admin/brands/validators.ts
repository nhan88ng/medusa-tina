import { z } from "zod"

export const CreateBrandSchema = z.object({
  name: z.string().min(1),
  handle: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  logo_url: z.string().optional(),
})

export type CreateBrandType = z.infer<typeof CreateBrandSchema>

export const UpdateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  handle: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  logo_url: z.string().optional(),
})

export type UpdateBrandType = z.infer<typeof UpdateBrandSchema>

export const LinkProductToBrandSchema = z.object({
  product_id: z.string().min(1),
})

export type LinkProductToBrandType = z.infer<typeof LinkProductToBrandSchema>
