import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { pushNhanhOrder } from "../lib/nhanh"
import { buildNhanhOrderPayload, CarrierOverride } from "../lib/nhanh-order-builder"

// ── Input / Output ──────────────────────────────────────────────────────────

export interface PushNhanhOrderInput {
  orderId: string
  carrierOverride?: CarrierOverride
}

export interface PushNhanhOrderOutput {
  skipped: boolean
  nhanh_order_id?: number
  nhanh_tracking_url?: string
  error?: string
}

// ── Step 1: Load order with full relations ──────────────────────────────────

const loadOrderStep = createStep(
  "push-nhanh-order--load-order",
  async (input: { orderId: string }, { container }) => {
    const orderModule = container.resolve(Modules.ORDER)
    const [order] = await orderModule.listOrders(
      { id: input.orderId },
      {
        relations: [
          "items",
          "items.variant",
          "shipping_address",
          "customer",
        ],
        take: 1,
      }
    )
    if (!order) {
      throw new Error(`Order ${input.orderId} not found`)
    }
    return new StepResponse({ order })
  }
)

// ── Step 2: Idempotency check ───────────────────────────────────────────────

const checkIdempotencyStep = createStep(
  "push-nhanh-order--check-idempotency",
  async (input: { order: any }, _ctx) => {
    const alreadyPushed = !!input.order.metadata?.nhanh_order_id
    return new StepResponse({ alreadyPushed })
  }
)

// ── Step 3: Build payload and push to Nhanh ─────────────────────────────────
//
// Never throws — catches errors internally and returns them as data so that
// Step 4 (persist) always runs regardless of push outcome.

const buildAndPushStep = createStep(
  "push-nhanh-order--build-and-push",
  async (
    input: { order: any; carrierOverride?: CarrierOverride },
    _ctx
  ) => {
    try {
      const payload = buildNhanhOrderPayload(input.order, {
        carrierOverride: input.carrierOverride,
      })
      const result = await pushNhanhOrder(payload)
      return new StepResponse({
        nhanhOrderId: result.id,
        trackingUrl: result.trackingUrl,
        error: null as string | null,
      })
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.error(`[Nhanh] buildAndPushStep failed for order ${input.order?.id}:`, msg)
      return new StepResponse({
        nhanhOrderId: null as number | null,
        trackingUrl: null as string | null,
        error: msg,
      })
    }
  }
)

// ── Step 4: Persist result on order.metadata ────────────────────────────────
//
// Always runs. Uses the error indicator from Step 3 to decide success/failure state.

const persistResultStep = createStep(
  "push-nhanh-order--persist-result",
  async (
    input: {
      orderId: string
      nhanhOrderId: number | null
      trackingUrl: string | null
      error: string | null
    },
    { container }
  ) => {
    const orderModule = container.resolve(Modules.ORDER)
    const [order] = await orderModule.listOrders({ id: input.orderId }, { take: 1 })
    if (!order) return new StepResponse({})

    const now = new Date().toISOString()
    const metadataPatch =
      input.error === null
        ? {
            nhanh_order_id: input.nhanhOrderId,
            nhanh_tracking_url: input.trackingUrl ?? "",
            nhanh_push_status: "success",
            nhanh_pushed_at: now,
            nhanh_error: null,
          }
        : {
            nhanh_push_status: "failed",
            nhanh_pushed_at: now,
            nhanh_error: input.error,
          }

    await orderModule.updateOrders(input.orderId, {
      metadata: { ...(order.metadata ?? {}), ...metadataPatch },
    })

    return new StepResponse({})
  }
)

// ── Workflow ────────────────────────────────────────────────────────────────

export const pushNhanhOrderWorkflow = createWorkflow(
  "push-nhanh-order",
  (input: PushNhanhOrderInput) => {
    const { order } = loadOrderStep({ orderId: input.orderId })
    const { alreadyPushed } = checkIdempotencyStep({ order })

    // Step 3 catches internally — workflow never throws from here
    const pushResult = buildAndPushStep({ order, carrierOverride: input.carrierOverride })

    // Step 4 always runs — persists success or failure state
    persistResultStep({
      orderId: input.orderId,
      nhanhOrderId: pushResult.nhanhOrderId,
      trackingUrl: pushResult.trackingUrl,
      error: pushResult.error,
    })

    // Medusa workflow DSL wraps step outputs in internal context types at
    // compile time — cast through unknown to match our declared output shape.
    return new WorkflowResponse<PushNhanhOrderOutput>({
      skipped: alreadyPushed,
      nhanh_order_id: pushResult.nhanhOrderId as unknown as number,
      nhanh_tracking_url: pushResult.trackingUrl as unknown as string,
      error: pushResult.error as unknown as string,
    })
  }
)
