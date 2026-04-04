interface PasswordResetData {
  reset_url: string
  actor_type?: string
}

export function renderPasswordReset(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const { reset_url, actor_type } = data as unknown as PasswordResetData

  const isAdmin = actor_type === "user"
  const greeting = isAdmin ? "Quản trị viên" : "Quý khách"

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
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Đặt lại mật khẩu</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333;">
                Xin chào <strong>${greeting}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #555;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tiếp tục:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${reset_url}"
                       style="display: inline-block; background-color: #1a1a2e; color: #ffffff; padding: 14px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 14px; color: #999;">
                Link này sẽ hết hạn sau <strong>15 phút</strong>.
              </p>

              <p style="margin: 0 0 16px; font-size: 14px; color: #999;">
                Nếu bạn không thể nhấn vào nút, hãy sao chép đường link sau vào trình duyệt:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; color: #999; word-break: break-all;">
                ${reset_url}
              </p>

              <div style="background-color: #fff3cd; border-radius: 6px; padding: 16px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; font-size: 13px; color: #856404;">
                  Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                </p>
              </div>
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
    subject: "Yêu cầu đặt lại mật khẩu",
    html,
  }
}
