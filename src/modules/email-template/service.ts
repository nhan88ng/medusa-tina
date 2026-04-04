import { MedusaService } from "@medusajs/framework/utils"
import EmailTemplate from "./models/email-template"

class EmailTemplateModuleService extends MedusaService({
  EmailTemplate,
}) {}

export default EmailTemplateModuleService
