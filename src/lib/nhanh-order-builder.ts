import { getNhanhProductIdFromVariant, NhanhOrderPayload } from "./nhanh"

export interface CarrierOverride {
  carrierId?: string | number
  serviceId?: string | number
}

/**
 * Maps a Medusa order (with full relations: items → variant, shipping_address)
 * to the Nhanh.vn /order/add payload.
 *
 * Throws with a descriptive message if required fields are missing so the
 * subscriber can persist the failure reason rather than swallowing silently.
 */
export function buildNhanhOrderPayload(
  order: any,
  opts?: { carrierOverride?: CarrierOverride }
): NhanhOrderPayload {
  // ── Carrier config ──────────────────────────────────────────────────────
  const carrierId = opts?.carrierOverride?.carrierId ?? process.env.NHANH_DEFAULT_CARRIER_ID
  const serviceId = opts?.carrierOverride?.serviceId ?? process.env.NHANH_DEFAULT_SERVICE_ID

  if (!carrierId) {
    throw new Error(
      "NHANH_DEFAULT_CARRIER_ID is not set and no carrierOverride provided"
    )
  }

  // ── Shipping address ─────────────────────────────────────────────────────
  const addr = order.shipping_address
  if (!addr) {
    throw new Error(`Order ${order.id} has no shipping_address`)
  }

  const cityId = Number(addr.metadata?.nhanh_city_id)
  const districtId = Number(addr.metadata?.nhanh_district_id)
  const wardId = Number(addr.metadata?.nhanh_ward_id)

  if (!cityId || !districtId || !wardId) {
    throw new Error(
      `Order ${order.id} shipping_address.metadata is missing nhanh_city_id / nhanh_district_id / nhanh_ward_id. ` +
        `Storefront must collect Nhanh location IDs and store them on the address.`
    )
  }

  const recipientName =
    [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim() ||
    order.customer?.first_name ||
    "Khách hàng"

  const mobile = addr.phone || order.customer?.phone || ""
  if (!mobile) {
    throw new Error(`Order ${order.id} has no phone number on shipping address or customer`)
  }

  // ── Line items → products ────────────────────────────────────────────────
  const items: NhanhOrderPayload["products"] = []
  for (const item of order.items ?? []) {
    const variant = item.variant
    if (!variant) {
      throw new Error(
        `Order ${order.id} line item ${item.id} has no variant relation loaded`
      )
    }

    const nhanhId = getNhanhProductIdFromVariant(variant)
    if (nhanhId === null) {
      throw new Error(
        `Variant ${variant.id} (SKU: ${variant.sku}) has no nhanh_id in metadata. ` +
          `Re-run product sync to backfill nhanh_id before pushing orders.`
      )
    }

    items.push({
      id: nhanhId,
      price: Math.round(item.unit_price ?? 0),
      quantity: item.quantity,
    })
  }

  if (items.length === 0) {
    throw new Error(`Order ${order.id} has no line items`)
  }

  // ── Assemble payload ─────────────────────────────────────────────────────
  const payload: NhanhOrderPayload = {
    info: {
      status: 54, // "Đơn mới"
    },
    channel: {
      appOrderId: order.id,
    },
    shippingAddress: {
      name: recipientName,
      mobile,
      cityId,
      districtId,
      wardId,
      address: addr.address_1 ?? "",
    },
    carrier: {
      carrierId,
      ...(serviceId ? { serviceId } : {}),
      sendCarrierType: 1, // use Nhanh preset pricing
      autoSend: 1,
    },
    products: items,
    payment: {}, // Nhanh / staff handles payment post-push (per design decision)
    locationVersion: "v1",
  }

  return payload
}
