export type DefaultTemplate = {
  template_key: string
  name: string
  description: string
  subject: string
  body: string
  is_enabled: boolean
  category: string
  available_variables: string
}

const emailWrapper = (content: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Tina Shop</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="margin:0;color:#6c757d;font-size:12px;">
                &copy; {{currentYear}} Tina Shop. All rights reserved.<br>
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

export const defaultTemplates: DefaultTemplate[] = [
  // ===== NHÓM 1: GIAO DỊCH (Transaction) =====
  {
    template_key: "order-confirmation",
    name: "Xác nhận đơn hàng",
    description: "Gửi ngay khi khách thanh toán thành công. Bao gồm mã đơn, danh sách sản phẩm và tổng tiền.",
    category: "transaction",
    is_enabled: true,
    subject: "Xác nhận đơn hàng #{{order_id}} - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Xác nhận đơn hàng</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Cảm ơn bạn đã đặt hàng tại <strong>Tina Shop</strong>! Đơn hàng <strong>#{{order_id}}</strong> của bạn đã được xác nhận.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr style="background-color:#1a1a2e;">
                  <th style="padding:10px 12px;color:#fff;font-size:13px;text-align:left;font-weight:600;">Sản phẩm</th>
                  <th style="padding:10px 12px;color:#fff;font-size:13px;text-align:center;font-weight:600;">SL</th>
                  <th style="padding:10px 12px;color:#fff;font-size:13px;text-align:right;font-weight:600;">Giá</th>
                </tr>
                {{#each items}}
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px 12px;color:#333;font-size:14px;">{{#if product.title}}{{product.title}}{{else}}{{title}}{{/if}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:center;">{{quantity}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:right;">{{formatPrice unit_price ../currency_code}}</td>
                </tr>
                {{/each}}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#f8f9fa;border-radius:6px;">
                <tr><td style="padding:8px 16px;color:#666;font-size:14px;">Tạm tính</td><td style="padding:8px 16px;color:#333;font-size:14px;text-align:right;">{{formatPrice subtotal currency_code}}</td></tr>
                <tr><td style="padding:8px 16px;color:#666;font-size:14px;">Phí vận chuyển</td><td style="padding:8px 16px;color:#333;font-size:14px;text-align:right;">{{formatPrice shipping_total currency_code}}</td></tr>
                {{#if tax_total}}<tr><td style="padding:8px 16px;color:#666;font-size:14px;">Thuế</td><td style="padding:8px 16px;color:#333;font-size:14px;text-align:right;">{{formatPrice tax_total currency_code}}</td></tr>{{/if}}
                <tr style="border-top:2px solid #dee2e6;"><td style="padding:12px 16px;color:#1a1a2e;font-size:16px;font-weight:700;">Tổng cộng</td><td style="padding:12px 16px;color:#1a1a2e;font-size:16px;font-weight:700;text-align:right;">{{formatPrice total currency_code}}</td></tr>
              </table>

              {{#if shipping_address}}
              <div style="background-color:#e8f4f8;border-radius:6px;padding:16px;margin-bottom:24px;">
                <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:14px;font-weight:600;">Địa chỉ giao hàng</h3>
                <p style="margin:0;color:#333;font-size:14px;line-height:1.5;">
                  {{shipping_address.first_name}} {{shipping_address.last_name}}<br>
                  {{shipping_address.address_1}}<br>
                  {{#if shipping_address.address_2}}{{shipping_address.address_2}}<br>{{/if}}
                  {{shipping_address.city}}, {{shipping_address.province}} {{shipping_address.postal_code}}<br>
                  {{#if shipping_address.phone}}ĐT: {{shipping_address.phone}}{{/if}}
                </p>
              </div>
              {{/if}}

              <p style="margin:0;color:#666;font-size:13px;">Chúng tôi sẽ thông báo khi đơn hàng được gửi đi. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      items: "Danh sách sản phẩm [{title, quantity, unit_price, product.title}]",
      subtotal: "Tạm tính",
      shipping_total: "Phí vận chuyển",
      tax_total: "Thuế",
      total: "Tổng cộng",
      currency_code: "Mã tiền tệ (vnd, usd...)",
      shipping_address: "Địa chỉ giao hàng {first_name, last_name, address_1, address_2, city, province, postal_code, phone}",
    }),
  },

  {
    template_key: "shipping-confirmation",
    name: "Thông báo đang giao hàng",
    description: "Gửi khi đơn hàng bắt đầu được vận chuyển. Bao gồm mã vận đơn để khách theo dõi.",
    category: "transaction",
    is_enabled: true,
    subject: "Đơn hàng #{{order_id}} đang được giao - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Đơn hàng đang được giao!</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Đơn hàng <strong>#{{order_id}}</strong> của bạn đã được giao cho đơn vị vận chuyển.</p>

              {{#if tracking_number}}
              <div style="background-color:#e8f4f8;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;color:#666;font-size:13px;">Mã vận đơn</p>
                <p style="margin:0;color:#1a1a2e;font-size:20px;font-weight:700;letter-spacing:1px;">{{tracking_number}}</p>
                {{#if tracking_url}}
                <a href="{{tracking_url}}" style="display:inline-block;margin-top:12px;background-color:#1a1a2e;color:#ffffff;padding:10px 24px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;">Theo dõi đơn hàng</a>
                {{/if}}
              </div>
              {{/if}}

              {{#if items}}
              <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:15px;font-weight:600;">Sản phẩm trong đơn</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                {{#each items}}
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px 12px;color:#333;font-size:14px;">{{#if product.title}}{{product.title}}{{else}}{{title}}{{/if}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:right;">x{{quantity}}</td>
                </tr>
                {{/each}}
              </table>
              {{/if}}

              <p style="margin:0;color:#666;font-size:13px;">Thời gian giao hàng dự kiến: 2-5 ngày làm việc. Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      tracking_number: "Mã vận đơn",
      tracking_url: "Link theo dõi đơn hàng",
      items: "Danh sách sản phẩm [{title, quantity, product.title}]",
    }),
  },

  {
    template_key: "delivery-confirmation",
    name: "Thông báo giao hàng thành công",
    description: "Gửi khi đơn hàng đã được giao thành công. Chuyển giao từ bán hàng sang chăm sóc.",
    category: "transaction",
    is_enabled: true,
    subject: "Đơn hàng #{{order_id}} đã giao thành công - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Đơn hàng đã giao thành công!</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Đơn hàng <strong>#{{order_id}}</strong> đã được giao thành công. Hy vọng bạn hài lòng với sản phẩm!</p>

              {{#if items}}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                {{#each items}}
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px 12px;color:#333;font-size:14px;">{{#if product.title}}{{product.title}}{{else}}{{title}}{{/if}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:right;">x{{quantity}}</td>
                </tr>
                {{/each}}
              </table>
              {{/if}}

              <div style="background-color:#f0f9f0;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;color:#333;font-size:15px;font-weight:600;">Bạn có hài lòng với đơn hàng?</p>
                <p style="margin:0 0 16px;color:#666;font-size:14px;">Đánh giá sản phẩm giúp chúng tôi phục vụ bạn tốt hơn</p>
                {{#if review_url}}
                <a href="{{review_url}}" style="display:inline-block;background-color:#28a745;color:#ffffff;padding:10px 24px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;">Đánh giá ngay</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Nếu có bất kỳ vấn đề gì, đừng ngần ngại liên hệ với chúng tôi nhé!</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      items: "Danh sách sản phẩm",
      review_url: "Link đánh giá sản phẩm",
    }),
  },

  {
    template_key: "order-cancelled",
    name: "Xác nhận hủy đơn hàng",
    description: "Gửi khi đơn hàng bị hủy. Đảm bảo minh bạch và giữ uy tín với khách.",
    category: "transaction",
    is_enabled: true,
    subject: "Đơn hàng #{{order_id}} đã được hủy - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#dc3545;font-size:20px;">Đơn hàng đã được hủy</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Đơn hàng <strong>#{{order_id}}</strong> đã được hủy thành công.</p>

              {{#if reason}}
              <div style="background-color:#fff3cd;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;color:#856404;font-size:14px;"><strong>Lý do hủy:</strong> {{reason}}</p>
              </div>
              {{/if}}

              {{#if items}}
              <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:15px;font-weight:600;">Sản phẩm trong đơn</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                {{#each items}}
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px 12px;color:#333;font-size:14px;">{{#if product.title}}{{product.title}}{{else}}{{title}}{{/if}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:right;">x{{quantity}}</td>
                </tr>
                {{/each}}
              </table>
              {{/if}}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#f8f9fa;border-radius:6px;">
                <tr><td style="padding:12px 16px;color:#1a1a2e;font-size:16px;font-weight:700;">Tổng hoàn trả</td><td style="padding:12px 16px;color:#dc3545;font-size:16px;font-weight:700;text-align:right;">{{formatPrice total currency_code}}</td></tr>
              </table>

              <p style="margin:0;color:#666;font-size:13px;">Nếu bạn đã thanh toán, số tiền sẽ được hoàn lại trong vòng 5-7 ngày làm việc. Chúng tôi rất tiếc vì sự bất tiện này.</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      reason: "Lý do hủy",
      items: "Danh sách sản phẩm",
      total: "Tổng tiền",
      currency_code: "Mã tiền tệ",
    }),
  },

  {
    template_key: "refund-confirmation",
    name: "Xác nhận hoàn tiền",
    description: "Gửi khi hoàn tiền cho khách hàng. Minh bạch quy trình hoàn tiền.",
    category: "transaction",
    is_enabled: true,
    subject: "Xác nhận hoàn tiền đơn hàng #{{order_id}} - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Xác nhận hoàn tiền</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Chúng tôi đã xử lý hoàn tiền cho đơn hàng <strong>#{{order_id}}</strong>.</p>

              <div style="background-color:#e8f4f8;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;color:#666;font-size:13px;">Số tiền hoàn trả</p>
                <p style="margin:0;color:#1a1a2e;font-size:24px;font-weight:700;">{{formatPrice refund_amount currency_code}}</p>
              </div>

              {{#if reason}}
              <div style="background-color:#f8f9fa;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;color:#666;font-size:14px;"><strong>Lý do:</strong> {{reason}}</p>
              </div>
              {{/if}}

              <p style="margin:0 0 8px;color:#333;font-size:14px;">Số tiền sẽ được hoàn về tài khoản của bạn trong vòng <strong>5-7 ngày làm việc</strong>, tùy thuộc vào phương thức thanh toán.</p>
              <p style="margin:0;color:#666;font-size:13px;">Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      refund_amount: "Số tiền hoàn",
      currency_code: "Mã tiền tệ",
      reason: "Lý do hoàn tiền",
    }),
  },

  {
    template_key: "password-reset",
    name: "Đặt lại mật khẩu",
    description: "Gửi khi khách hàng hoặc admin yêu cầu reset mật khẩu. Có link reset và thời hạn 15 phút.",
    category: "transaction",
    is_enabled: true,
    subject: "Đặt lại mật khẩu - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Đặt lại mật khẩu</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if (eq actor_type "user")}}Quản trị viên{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>

              <div style="text-align:center;margin-bottom:24px;">
                <a href="{{reset_url}}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Đặt lại mật khẩu</a>
              </div>

              <div style="background-color:#fff3cd;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;color:#856404;font-size:14px;">⏰ Link này sẽ hết hạn sau <strong>15 phút</strong>.</p>
              </div>

              <p style="margin:0 0 8px;color:#666;font-size:13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
              <p style="margin:0;color:#666;font-size:12px;">Hoặc copy link: {{reset_url}}</p>
    `),
    available_variables: JSON.stringify({
      reset_url: "Link đặt lại mật khẩu",
      actor_type: "Loại tài khoản (customer hoặc user)",
    }),
  },

  // ===== NHÓM 2: TĂNG TRƯỞNG (Growth) =====
  {
    template_key: "welcome-customer",
    name: "Chào mừng khách hàng mới",
    description: "Gửi khi khách vừa đăng ký tài khoản. Giới thiệu thương hiệu và ưu đãi đầu tiên.",
    category: "growth",
    is_enabled: true,
    subject: "Chào mừng bạn đến với Tina Shop! 🎉",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Chào mừng bạn!</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}bạn{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Cảm ơn bạn đã đăng ký tài khoản tại <strong>Tina Shop</strong>! Chúng tôi rất vui được chào đón bạn.</p>

              <div style="background-color:#f0f9f0;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;color:#28a745;font-size:18px;font-weight:700;">Ưu đãi cho thành viên mới</p>
                <p style="margin:0 0 16px;color:#333;font-size:14px;">Khám phá các sản phẩm tuyệt vời với ưu đãi đặc biệt dành riêng cho bạn</p>
                {{#if store_url}}
                <a href="{{store_url}}" style="display:inline-block;background-color:#28a745;color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;">Mua sắm ngay</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Nếu cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi nhé!</p>
    `),
    available_variables: JSON.stringify({
      customer_name: "Tên khách hàng",
      email: "Email khách hàng",
      store_url: "Link cửa hàng",
    }),
  },

  {
    template_key: "abandoned-cart",
    name: "Bỏ quên giỏ hàng",
    description: "Nhắc khách hàng quay lại hoàn tất thanh toán sau 1h kể từ khi thoát trang.",
    category: "growth",
    is_enabled: true,
    subject: "Bạn quên giỏ hàng rồi! - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Bạn quên gì chưa?</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}bạn{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Chúng tôi nhận thấy bạn có sản phẩm trong giỏ hàng nhưng chưa hoàn tất thanh toán. Đừng để bỏ lỡ nhé!</p>

              {{#if items}}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr style="background-color:#f8f9fa;">
                  <th style="padding:10px 12px;color:#333;font-size:13px;text-align:left;font-weight:600;">Sản phẩm</th>
                  <th style="padding:10px 12px;color:#333;font-size:13px;text-align:center;font-weight:600;">SL</th>
                  <th style="padding:10px 12px;color:#333;font-size:13px;text-align:right;font-weight:600;">Giá</th>
                </tr>
                {{#each items}}
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px 12px;color:#333;font-size:14px;">{{title}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:center;">{{quantity}}</td>
                  <td style="padding:10px 12px;color:#333;font-size:14px;text-align:right;">{{formatPrice unit_price ../currency_code}}</td>
                </tr>
                {{/each}}
              </table>
              {{/if}}

              <div style="text-align:center;margin-bottom:24px;">
                {{#if cart_url}}
                <a href="{{cart_url}}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Quay lại giỏ hàng</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Sản phẩm có số lượng giới hạn, hãy nhanh tay đặt hàng trước khi hết nhé!</p>
    `),
    available_variables: JSON.stringify({
      customer_name: "Tên khách hàng",
      items: "Danh sách sản phẩm trong giỏ [{title, quantity, unit_price}]",
      currency_code: "Mã tiền tệ",
      cart_url: "Link giỏ hàng",
      total: "Tổng giá trị giỏ hàng",
    }),
  },

  // ===== NHÓM 3: CHĂM SÓC (Care) =====
  {
    template_key: "review-request",
    name: "Yêu cầu đánh giá sản phẩm",
    description: "Gửi 3-7 ngày sau khi giao hàng. Khuyến khích khách đánh giá và gửi ảnh.",
    category: "care",
    is_enabled: true,
    subject: "Bạn thấy sản phẩm thế nào? - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Chia sẻ trải nghiệm của bạn</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}Quý khách{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Bạn đã nhận được đơn hàng <strong>#{{order_id}}</strong> gần đây. Chúng tôi rất muốn nghe ý kiến của bạn!</p>

              {{#if items}}
              <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:15px;font-weight:600;">Sản phẩm bạn đã mua</h3>
              {{#each items}}
              <div style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:12px;">
                <p style="margin:0;color:#333;font-size:14px;font-weight:600;">{{#if product.title}}{{product.title}}{{else}}{{title}}{{/if}}</p>
              </div>
              {{/each}}
              {{/if}}

              <div style="text-align:center;margin:24px 0;">
                {{#if review_url}}
                <a href="{{review_url}}" style="display:inline-block;background-color:#ffc107;color:#333;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Đánh giá ngay</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Đánh giá của bạn giúp những khách hàng khác lựa chọn tốt hơn. Cảm ơn bạn!</p>
    `),
    available_variables: JSON.stringify({
      order_id: "Mã đơn hàng",
      customer_name: "Tên khách hàng",
      items: "Danh sách sản phẩm",
      review_url: "Link đánh giá",
    }),
  },

  // ===== NHÓM 4: GẮN KẾT (Engagement) =====
  {
    template_key: "win-back",
    name: "Email nhung nhớ (Win-back)",
    description: "Gửi cho khách lâu không mua (30-60 ngày) với ưu đãi để đón khách quay lại.",
    category: "engagement",
    is_enabled: false,
    subject: "Chúng mình nhớ bạn! - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Lâu rồi không gặp!</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}bạn{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Đã lâu rồi chúng tôi không thấy bạn ghé thăm. Chúng tôi có rất nhiều sản phẩm mới muốn giới thiệu đến bạn!</p>

              <div style="background-color:#f0f9f0;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 8px;color:#28a745;font-size:18px;font-weight:700;">Quà dành riêng cho bạn</p>
                <p style="margin:0 0 16px;color:#333;font-size:14px;">Ưu đãi đặc biệt cho lần mua sắm tiếp theo</p>
                {{#if store_url}}
                <a href="{{store_url}}" style="display:inline-block;background-color:#28a745;color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600;">Khám phá ngay</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Chúng tôi luôn ở đây để phục vụ bạn. Hẹn gặp lại!</p>
    `),
    available_variables: JSON.stringify({
      customer_name: "Tên khách hàng",
      store_url: "Link cửa hàng",
      last_order_date: "Ngày mua hàng gần nhất",
      days_inactive: "Số ngày không hoạt động",
    }),
  },

  {
    template_key: "repurchase-reminder",
    name: "Nhắc mua lại",
    description: "Nhắc khách mua lại sản phẩm tiêu hao sau chu kỳ sử dụng (25-28 ngày).",
    category: "engagement",
    is_enabled: false,
    subject: "Đã đến lúc bổ sung {{product_name}}? - Tina Shop",
    body: emailWrapper(`
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Đã đến lúc mua lại!</h2>
              <p style="margin:0 0 8px;color:#333;font-size:15px;">Xin chào {{#if customer_name}}{{customer_name}}{{else}}bạn{{/if}},</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;">Có vẻ như đã gần đến lúc bạn cần bổ sung lại sản phẩm đã mua trước đó.</p>

              {{#if items}}
              <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:15px;font-weight:600;">Sản phẩm cần bổ sung</h3>
              {{#each items}}
              <div style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;">
                <p style="margin:0;color:#333;font-size:14px;font-weight:600;">{{title}}</p>
              </div>
              {{/each}}
              {{/if}}

              <div style="text-align:center;margin:24px 0;">
                {{#if reorder_url}}
                <a href="{{reorder_url}}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Đặt hàng lại ngay</a>
                {{/if}}
              </div>

              <p style="margin:0;color:#666;font-size:13px;">Đặt hàng sớm để không bị gián đoạn nhé!</p>
    `),
    available_variables: JSON.stringify({
      customer_name: "Tên khách hàng",
      product_name: "Tên sản phẩm chính",
      items: "Danh sách sản phẩm [{title}]",
      reorder_url: "Link đặt hàng lại",
      days_since_purchase: "Số ngày kể từ lần mua trước",
    }),
  },
]
