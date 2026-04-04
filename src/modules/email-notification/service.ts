import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { Logger, NotificationTypes } from "@medusajs/framework/types"
import nodemailer, { Transporter } from "nodemailer"
import { renderOrderConfirmation } from "./templates/order-confirmation"
import { renderPasswordReset } from "./templates/password-reset"

type InjectedDependencies = {
  logger: Logger
}

export type GmailNotificationOptions = {
  email_from: string
  email_from_name?: string
  gmail_user: string
  google_client_id: string
  google_client_secret: string
  google_refresh_token: string
}

class GmailNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-gmail"

  protected logger_: Logger
  protected options_: GmailNotificationOptions
  protected transporter_: Transporter

  constructor(
    { logger }: InjectedDependencies,
    options: GmailNotificationOptions
  ) {
    super()

    this.logger_ = logger
    this.options_ = options

    this.transporter_ = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: options.gmail_user,
        clientId: options.google_client_id,
        clientSecret: options.google_client_secret,
        refreshToken: options.google_refresh_token,
      },
    })
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      )
    }

    const from = notification.from?.trim()
      || `${this.options_.email_from_name || ""} <${this.options_.email_from}>`.trim()

    let subject: string
    let html: string

    const renderedData = notification.data as Record<string, unknown> | undefined
    if (renderedData?._rendered && (renderedData._rendered as Record<string, string>).subject && (renderedData._rendered as Record<string, string>).html) {
      const rendered = renderedData._rendered as { subject: string; html: string }
      subject = rendered.subject
      html = rendered.html
    } else if (notification.content?.subject && notification.content?.html) {
      subject = notification.content.subject
      html = notification.content.html
    } else {
      const rendered = this.renderTemplate(
        notification.template,
        renderedData || {}
      )
      subject = rendered.subject
      html = rendered.html
    }

    const attachments = Array.isArray(notification.attachments)
      ? notification.attachments.map((attachment) => ({
          content: attachment.content,
          filename: attachment.filename,
          contentType: attachment.content_type,
        }))
      : undefined

    try {
      const info = await this.transporter_.sendMail({
        from,
        to: notification.to,
        subject,
        html,
        attachments,
      })

      this.logger_.info(
        `Email sent to ${notification.to} (messageId: ${info.messageId})`
      )

      return { id: info.messageId }
    } catch (error) {
      this.logger_.error(
        `Failed to send email to ${notification.to}: ${error.message}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error.message}`
      )
    }
  }

  private renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): { subject: string; html: string } {
    switch (template) {
      case "order-confirmation":
        return renderOrderConfirmation(data)
      case "password-reset":
        return renderPasswordReset(data)
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown email template: ${template}`
        )
    }
  }
}

export default GmailNotificationService
