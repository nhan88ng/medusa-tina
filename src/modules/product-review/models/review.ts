import { model } from "@medusajs/framework/utils"

const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text().nullable(),
  rating: model.number(),
  title: model.text().nullable(),
  content: model.text(),
  first_name: model.text(),
  last_name: model.text(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  images: model.json().nullable(),
})

export default Review
