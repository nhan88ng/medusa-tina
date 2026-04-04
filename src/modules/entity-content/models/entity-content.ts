import { model } from "@medusajs/framework/utils"

const EntityContent = model.define("entity_content", {
  id: model.id().primaryKey(),
  content: model.text().nullable(),
})

export default EntityContent
