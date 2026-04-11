import { model } from "@medusajs/framework/utils"

const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  external_id: model.text().unique().nullable(),
  description: model.text().nullable(),
  content: model.text().nullable(),
  logo_url: model.text().nullable(),
})

export default Brand
