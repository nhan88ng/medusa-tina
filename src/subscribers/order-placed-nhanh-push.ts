import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { pushNhanhOrderWorkflow } from "../workflows/push-nhanh-order"

/**
 * Listens to `order.placed` and pushes the order to Nhanh.vn POS.
 *
 * Intentionally separate from `order-placed.ts` (email) so that email
 * failures do not block the Nhanh push, and vice versa.
 *
 * The workflow's buildAndPushStep catches its own errors and persists them
 * as `nhanh_push_status = failed` on order.metadata — this subscriber never
 * throws so as not to disrupt other event handlers.
 */
export default async function pushOrderToNhanh({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderId = data.id

  try {
    // Guard: skip if already pushed (idempotency — e.g. event fired twice)
    const orderModule = container.resolve(Modules.ORDER)
    const [order] = await orderModule.listOrders({ id: orderId }, { take: 1 })
    if (!order) {
      logger.warn(`[nhanh-push] Order ${orderId} not found, skipping`)
      return
    }

    if (order.metadata?.nhanh_order_id) {
      logger.info(`[nhanh-push] Order ${orderId} already pushed (nhanh_order_id=${order.metadata.nhanh_order_id}), skipping`)
      return
    }

    const { result } = await pushNhanhOrderWorkflow(container).run({
      input: { orderId },
    })

    if (result.error) {
      logger.error(`[nhanh-push] Order ${orderId} push failed: ${result.error}`)
    } else if (result.skipped) {
      logger.info(`[nhanh-push] Order ${orderId} skipped (already has nhanh_order_id)`)
    } else {
      logger.info(
        `[nhanh-push] Order ${orderId} pushed → nhanh_order_id=${result.nhanh_order_id}`
      )
    }
  } catch (err: any) {
    // Belt-and-suspenders catch: should not reach here because the workflow
    // catches internally, but guard anyway to prevent crashing other subscribers.
    logger.error(
      `[nhanh-push] Unexpected error for order ${orderId}: ${err?.message ?? String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
