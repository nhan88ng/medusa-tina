import { model } from "@medusajs/framework/utils"

const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  description: model.text().nullable(),
  content: model.text().nullable(),
  logo_url: model.text().nullable(),
})

export default Brand
