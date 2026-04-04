import EmailTemplateModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const EMAIL_TEMPLATE_MODULE = "emailTemplate"

export default Module(EMAIL_TEMPLATE_MODULE, {
  service: EmailTemplateModuleService,
})
