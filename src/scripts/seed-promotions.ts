import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedPromotions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModuleService = container.resolve(Modules.PROMOTION)

  logger.info("Seeding promotions...")

  // Check if any of these promotions already exist (idempotent)
  const existing = await promotionModuleService.listPromotions({
    code: ["WELCOME10", "FREESHIP", "50KOFF"],
  })

  const existingCodes = new Set(existing.map((p) => p.code))

  // 1. WELCOME10 — 10% off entire order
  if (!existingCodes.has("WELCOME10")) {
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: "WELCOME10",
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: "percentage",
              target_type: "order",
              value: 10,
              currency_code: "vnd",
            },
          },
        ],
      },
    })
    logger.info("Created promotion: WELCOME10 (10% off order)")
  } else {
    logger.info("Promotion WELCOME10 already exists, skipping.")
  }

  // 2. FREESHIP — Free shipping (covers standard 30k shipping)
  if (!existingCodes.has("FREESHIP")) {
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: "FREESHIP",
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: "fixed",
              target_type: "shipping_methods",
              allocation: "each",
              max_quantity: 1,
              value: 50000,
              currency_code: "vnd",
            },
          },
        ],
      },
    })
    logger.info("Created promotion: FREESHIP (free shipping up to 50k)")
  } else {
    logger.info("Promotion FREESHIP already exists, skipping.")
  }

  // 3. 50KOFF — 50,000 VND off any VND order
  if (!existingCodes.has("50KOFF")) {
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: "50KOFF",
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: "fixed",
              target_type: "order",
              value: 50000,
              currency_code: "vnd",
            },
            rules: [
              {
                attribute: "currency_code",
                operator: "eq",
                values: ["vnd"],
              },
            ],
          },
        ],
      },
    })
    logger.info("Created promotion: 50KOFF (50,000 VND off)")
  } else {
    logger.info("Promotion 50KOFF already exists, skipping.")
  }

  logger.info("Finished seeding promotions.")
}
