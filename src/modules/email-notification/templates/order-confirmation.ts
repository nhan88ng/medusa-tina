interface OrderItem {
  title?: string
  product_title?: string
  quantity: number
  unit_price: number
  product?: {
    title?: string
  }
}

interface OrderData {
  order_id?: string | number
  display_id?: string | number
  customer_name?: string
  items?: OrderItem[]
  total?: number
  subtotal?: number
  shipping_total?: number
  tax_total?: number
  currency?: string
  currency_code?: string
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    address_2?: string
    city?: string
    province?: string
    postal_code?: string
    country_code?: string
  }
}

export function renderOrderConfirmation(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const order = (data as unknown) as OrderData

  const orderId = order.order_id || order.display_id || "N/A"
  const customerName = order.customer_name || "Quý khách"
  const currency = (order.currency || order.currency_code || "VND").toUpperCase()

  const itemsHtml = (order.items || [])
    .map((item) => {
      const title = item.title || item.product_title || item.product?.title || "Sản phẩm"
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unit_price, currency)}</td>
        </tr>`
    })
    .join("")

  const addr = order.shipping_address
  const addressHtml = addr
    ? `
      <p style="margin: 0; color: #555;">
        ${addr.first_name || ""} ${addr.last_name || ""}<br/>
        ${addr.address_1 || ""}<br/>
        ${addr.city || ""}${addr.province ? ", " + addr.province : ""}${addr.postal_code ? " " + addr.postal_code : ""}
      </p>`
    : "<p style='color: #999;'>Không có thông tin</p>"

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Xác nhận đơn hàng</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333;">
                Xin chào <strong>${customerName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #555;">
                Cảm ơn bạn đã đặt hàng! Đơn hàng <strong>#${orderId}</strong> của bạn đã được tiếp nhận.
              </p>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #dee2e6;">Sản phẩm</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #333; border-bottom: 2px solid #dee2e6;">SL</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #333; border-bottom: 2px solid #dee2e6;">Giá</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${order.subtotal != null ? `<tr><td style="padding: 6px 0; color: #555;">Tạm tính</td><td style="padding: 6px 0; text-align: right; color: #555;">${formatPrice(order.subtotal, currency)}</td></tr>` : ""}
                ${order.shipping_total != null ? `<tr><td style="padding: 6px 0; color: #555;">Phí giao hàng</td><td style="padding: 6px 0; text-align: right; color: #555;">${formatPrice(order.shipping_total, currency)}</td></tr>` : ""}
                ${order.tax_total != null ? `<tr><td style="padding: 6px 0; color: #555;">Thuế</td><td style="padding: 6px 0; text-align: right; color: #555;">${formatPrice(order.tax_total, currency)}</td></tr>` : ""}
                ${order.total != null ? `<tr><td style="padding: 8px 0; font-weight: 700; font-size: 18px; color: #1a1a2e; border-top: 2px solid #dee2e6;">Tổng cộng</td><td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #1a1a2e; border-top: 2px solid #dee2e6;">${formatPrice(order.total, currency)}</td></tr>` : ""}
              </table>

              <!-- Shipping Address -->
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px; font-size: 14px; color: #333; font-weight: 600;">Địa chỉ giao hàng</h3>
                ${addressHtml}
              </div>

              <p style="margin: 0; font-size: 14px; color: #999; text-align: center;">
                Bạn sẽ nhận được thông báo khi đơn hàng được giao.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return {
    subject: `Xác nhận đơn hàng #${orderId}`,
    html,
  }
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
