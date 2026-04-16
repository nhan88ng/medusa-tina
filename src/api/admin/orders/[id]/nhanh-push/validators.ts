import { z } from "zod"

export const NhanhPushBodySchema = z.object({
  carrierOverride: z
    .object({
      carrierId: z.union([z.string(), z.number()]).optional(),
      serviceId: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
  force: z.boolean().optional().default(false),
})

export type NhanhPushBody = z.infer<typeof NhanhPushBodySchema>
