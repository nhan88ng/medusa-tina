import { z } from "zod"

export const CreateEmailTemplateSchema = z.object({
  template_key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  is_enabled: z.boolean().optional(),
  category: z.enum(["transaction", "growth", "care", "engagement"]),
  available_variables: z.string().optional(),
})

export type CreateEmailTemplateType = z.infer<typeof CreateEmailTemplateSchema>

export const UpdateEmailTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  is_enabled: z.boolean().optional(),
  category: z.enum(["transaction", "growth", "care", "engagement"]).optional(),
  available_variables: z.string().optional(),
})

export type UpdateEmailTemplateType = z.infer<typeof UpdateEmailTemplateSchema>

export const TestEmailTemplateSchema = z.object({
  to: z.string().email(),
})

export type TestEmailTemplateType = z.infer<typeof TestEmailTemplateSchema>
