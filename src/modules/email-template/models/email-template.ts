import { model } from "@medusajs/framework/utils"

const EmailTemplate = model.define("email_template", {
  id: model.id().primaryKey(),
  template_key: model.text().unique(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  subject: model.text(),
  body: model.text(),
  is_enabled: model.boolean().default(true),
  category: model.text(),
  available_variables: model.text().nullable(),
})

export default EmailTemplate
