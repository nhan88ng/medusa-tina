import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { pushNhanhOrderWorkflow } from "../../../../../workflows/push-nhanh-order"
import { NhanhPushBodySchema } from "./validators"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const orderId = req.params.id

  // Validate body (empty body is fine — all fields optional)
  const parsed = NhanhPushBodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues })
  }

  const { carrierOverride, force } = parsed.data

  // Guard: skip if already pushed (unless force=true)
  if (!force) {
    const orderModule = req.scope.resolve("order")
    const [order] = await orderModule.listOrders({ id: orderId }, { take: 1 })
    if (!order) {
      return res.status(404).json({ message: `Order ${orderId} not found` })
    }
    if (order.metadata?.nhanh_order_id) {
      return res.json({
        success: true,
        skipped: true,
        nhanh_order_id: order.metadata.nhanh_order_id,
        message: "Already pushed. Use force=true to re-push.",
      })
    }
  }

  const { result } = await pushNhanhOrderWorkflow(req.scope).run({
    input: { orderId, carrierOverride },
  })

  if (result.error) {
    return res.status(200).json({
      success: false,
      error: result.error,
    })
  }

  res.json({
    success: true,
    skipped: result.skipped ?? false,
    nhanh_order_id: result.nhanh_order_id,
    nhanh_tracking_url: result.nhanh_tracking_url,
  })
}
