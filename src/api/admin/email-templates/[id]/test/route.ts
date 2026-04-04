import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_TEMPLATE_MODULE } from "../../../../../modules/email-template"
import EmailTemplateModuleService from "../../../../../modules/email-template/service"
import { renderTemplate } from "../../../../../lib/email-utils"
import { TestEmailTemplateType } from "../../validators"

const sampleData: Record<string, Record<string, unknown>> = {
  "order-confirmation": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, unit_price: 1500000, product: { title: "Túi xách da cao cấp" } },
      { title: "Ví cầm tay nữ", quantity: 2, unit_price: 350000, product: { title: "Ví cầm tay nữ" } },
    ],
    subtotal: 2200000,
    shipping_total: 30000,
    tax_total: 0,
    total: 2230000,
    currency_code: "vnd",
    shipping_address: {
      first_name: "Nguyễn",
      last_name: "Văn A",
      address_1: "123 Nguyễn Huệ",
      city: "TP. Hồ Chí Minh",
      province: "HCM",
      postal_code: "700000",
      phone: "0901234567",
    },
  },
  "shipping-confirmation": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    tracking_number: "VN123456789",
    tracking_url: "https://tracking.example.com/VN123456789",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, product: { title: "Túi xách da cao cấp" } },
    ],
  },
  "delivery-confirmation": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, product: { title: "Túi xách da cao cấp" } },
    ],
    review_url: "https://tina.shop/review/1001",
  },
  "order-cancelled": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    reason: "Khách hàng yêu cầu hủy",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, product: { title: "Túi xách da cao cấp" } },
    ],
    total: 1530000,
    currency_code: "vnd",
  },
  "refund-confirmation": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    refund_amount: 1530000,
    currency_code: "vnd",
    reason: "Sản phẩm không đúng mô tả",
  },
  "password-reset": {
    reset_url: "https://tina.shop/reset-password?token=sample-token",
    actor_type: "customer",
  },
  "welcome-customer": {
    customer_name: "Nguyễn Văn A",
    email: "test@example.com",
    store_url: "https://tina.shop",
  },
  "abandoned-cart": {
    customer_name: "Nguyễn Văn A",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, unit_price: 1500000 },
    ],
    currency_code: "vnd",
    cart_url: "https://tina.shop/cart",
    total: 1500000,
  },
  "review-request": {
    order_id: "1001",
    customer_name: "Nguyễn Văn A",
    items: [
      { title: "Túi xách da cao cấp", quantity: 1, product: { title: "Túi xách da cao cấp" } },
    ],
    review_url: "https://tina.shop/review/1001",
  },
  "win-back": {
    customer_name: "Nguyễn Văn A",
    store_url: "https://tina.shop",
    last_order_date: "2026-02-15",
    days_inactive: 45,
  },
  "repurchase-reminder": {
    customer_name: "Nguyễn Văn A",
    product_name: "Hạt cho mèo Royal Canin",
    items: [{ title: "Hạt cho mèo Royal Canin 2kg" }],
    reorder_url: "https://tina.shop/products/hat-cho-meo",
    days_since_purchase: 28,
  },
}

export const POST = async (
  req: AuthenticatedMedusaRequest<TestEmailTemplateType>,
  res: MedusaResponse
) => {
  const service: EmailTemplateModuleService = req.scope.resolve(EMAIL_TEMPLATE_MODULE)
  const template = await service.retrieveEmailTemplate(req.params.id)

  const data = sampleData[template.template_key] || {}
  const rendered = renderTemplate(template.subject, template.body, data)

  const notificationService = req.scope.resolve("notification")
  await notificationService.createNotifications({
    to: req.validatedBody.to,
    channel: "email",
    template: template.template_key,
    data: {
      ...data,
      _rendered: rendered,
    },
  })

  res.json({
    success: true,
    message: `Test email sent to ${req.validatedBody.to}`,
    template_key: template.template_key,
  })
}
